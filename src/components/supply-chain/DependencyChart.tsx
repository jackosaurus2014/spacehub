'use client';

import { useState, useMemo } from 'react';
import {
  SupplyChainCompany,
  SupplyRelationship,
  SUPPLY_CHAIN_TIERS,
  SUPPLY_CHAIN_COUNTRIES,
  GEOPOLITICAL_RISK_INFO,
} from '@/types';

interface DependencyChartProps {
  companies: SupplyChainCompany[];
  relationships: SupplyRelationship[];
  selectedCompanyId?: string | null;
  onSelectCompany?: (companyId: string | null) => void;
  showHighRiskOnly?: boolean;
}

export default function DependencyChart({
  companies,
  relationships,
  selectedCompanyId,
  onSelectCompany,
  showHighRiskOnly = false,
}: DependencyChartProps) {
  const [hoveredCompany, setHoveredCompany] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tier' | 'country' | 'risk'>('tier');

  // Filter relationships if showing high risk only
  const filteredRelationships = useMemo(() => {
    if (showHighRiskOnly) {
      return relationships.filter((r) => r.geopoliticalRisk === 'high' || r.isCritical);
    }
    return relationships;
  }, [relationships, showHighRiskOnly]);

  // Group companies by view mode
  const groupedCompanies = useMemo(() => {
    const groups: Record<string, SupplyChainCompany[]> = {};

    companies.forEach((company) => {
      let key: string;
      switch (viewMode) {
        case 'tier':
          key = company.tier;
          break;
        case 'country':
          key = company.countryCode;
          break;
        case 'risk':
          const countryRisk = SUPPLY_CHAIN_COUNTRIES[company.countryCode]?.risk || 'none';
          key = countryRisk;
          break;
        default:
          key = 'other';
      }
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(company);
    });

    return groups;
  }, [companies, viewMode]);

  // Get group label
  const getGroupLabel = (key: string) => {
    switch (viewMode) {
      case 'tier':
        return SUPPLY_CHAIN_TIERS.find((t) => t.value === key)?.label || key;
      case 'country':
        return SUPPLY_CHAIN_COUNTRIES[key]?.name || key;
      case 'risk':
        return GEOPOLITICAL_RISK_INFO[key as keyof typeof GEOPOLITICAL_RISK_INFO]?.label || key;
      default:
        return key;
    }
  };

  // Get group color
  const getGroupColor = (key: string) => {
    switch (viewMode) {
      case 'tier':
        const tier = SUPPLY_CHAIN_TIERS.find((t) => t.value === key);
        return tier?.color || 'text-slate-400';
      case 'country':
        const country = SUPPLY_CHAIN_COUNTRIES[key];
        if (country?.risk === 'high') return 'text-red-400';
        if (country?.risk === 'medium') return 'text-yellow-400';
        return 'text-green-400';
      case 'risk':
        return GEOPOLITICAL_RISK_INFO[key as keyof typeof GEOPOLITICAL_RISK_INFO]?.color || 'text-slate-400';
      default:
        return 'text-slate-400';
    }
  };

  // Get relationships for a company
  const getCompanyRelationships = (companyId: string) => {
    return filteredRelationships.filter(
      (r) => r.supplierId === companyId || r.customerId === companyId
    );
  };

  // Check if company is connected to selected/hovered
  const isConnected = (companyId: string) => {
    const targetId = hoveredCompany || selectedCompanyId;
    if (!targetId) return false;
    return filteredRelationships.some(
      (r) =>
        (r.supplierId === targetId && r.customerId === companyId) ||
        (r.customerId === targetId && r.supplierId === companyId)
    );
  };

  // Order groups
  const orderedGroups = useMemo(() => {
    const entries = Object.entries(groupedCompanies);
    if (viewMode === 'tier') {
      const order = ['prime', 'tier1', 'tier2', 'tier3'];
      return entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    }
    if (viewMode === 'risk') {
      const order = ['high', 'medium', 'low', 'none'];
      return entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    }
    return entries.sort((a, b) => b[1].length - a[1].length);
  }, [groupedCompanies, viewMode]);

  return (
    <div className="bg-space-800 rounded-xl border border-space-700">
      {/* Header with view mode selector */}
      <div className="p-4 border-b border-space-700">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold text-white">Supply Chain Dependencies</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Group by:</span>
            <div className="flex rounded-lg overflow-hidden border border-space-600">
              {[
                { value: 'tier', label: 'Tier' },
                { value: 'country', label: 'Country' },
                { value: 'risk', label: 'Risk' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setViewMode(option.value as typeof viewMode)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === option.value
                      ? 'bg-nebula-500 text-white'
                      : 'bg-space-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-slate-400">Prime</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span className="text-slate-400">Tier 1</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-400">Tier 2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-slate-400">Tier 3</span>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-slate-400">High Risk</span>
          </div>
        </div>
      </div>

      {/* Dependency visualization */}
      <div className="p-4 space-y-6">
        {orderedGroups.map(([groupKey, groupCompanies]) => (
          <div key={groupKey}>
            {/* Group header */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-sm font-semibold ${getGroupColor(groupKey)}`}>
                {getGroupLabel(groupKey)}
              </span>
              <span className="text-xs text-slate-500">({groupCompanies.length})</span>
              {viewMode === 'country' && (
                <span className="text-lg">
                  {SUPPLY_CHAIN_COUNTRIES[groupKey]?.flag || '🏳️'}
                </span>
              )}
            </div>

            {/* Company nodes */}
            <div className="flex flex-wrap gap-2">
              {groupCompanies.map((company) => {
                const countryInfo = SUPPLY_CHAIN_COUNTRIES[company.countryCode];
                const isHighRisk = countryInfo?.risk === 'high';
                const companyRels = getCompanyRelationships(company.id);
                const hasHighRiskRel = companyRels.some((r) => r.geopoliticalRisk === 'high');
                const isSelected = selectedCompanyId === company.id;
                const isHovered = hoveredCompany === company.id;
                const connected = isConnected(company.id);

                // Get tier color for the node
                const tierInfo = SUPPLY_CHAIN_TIERS.find((t) => t.value === company.tier);

                return (
                  <button
                    key={company.id}
                    onMouseEnter={() => setHoveredCompany(company.id)}
                    onMouseLeave={() => setHoveredCompany(null)}
                    onClick={() => onSelectCompany?.(isSelected ? null : company.id)}
                    className={`
                      relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isSelected ? 'ring-2 ring-nebula-500 ring-offset-2 ring-offset-space-800' : ''}
                      ${isHovered ? 'scale-105 z-10' : ''}
                      ${connected && !isSelected && !isHovered ? 'opacity-100' : ''}
                      ${!connected && (hoveredCompany || selectedCompanyId) && !isSelected && !isHovered ? 'opacity-40' : ''}
                      ${isHighRisk || hasHighRiskRel ? 'border-2 border-red-500/50' : 'border border-space-600'}
                      ${tierInfo?.bgColor}/20 hover:${tierInfo?.bgColor}/30
                    `}
                    style={{
                      backgroundColor: isSelected || isHovered
                        ? `var(--tw-${tierInfo?.bgColor?.replace('bg-', '')})`
                        : undefined,
                    }}
                  >
                    {/* Country flag */}
                    <span className="mr-1.5">{countryInfo?.flag || '🏳️'}</span>

                    {/* Company name */}
                    <span className={`${tierInfo?.color || 'text-white'}`}>
                      {company.name.length > 20 ? company.name.slice(0, 20) + '...' : company.name}
                    </span>

                    {/* Criticality indicator */}
                    {company.criticality === 'high' && (
                      <span className="ml-1.5 text-xs text-yellow-400" title="High Criticality">
                        ★
                      </span>
                    )}

                    {/* High risk indicator */}
                    {(isHighRisk || hasHighRiskRel) && (
                      <span
                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"
                        title="High Geopolitical Risk"
                      ></span>
                    )}

                    {/* Relationship count on hover */}
                    {isHovered && companyRels.length > 0 && (
                      <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-slate-400 whitespace-nowrap">
                        {companyRels.length} connections
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected company details */}
      {selectedCompanyId && (
        <div className="border-t border-space-700 p-4">
          {(() => {
            const selected = companies.find((c) => c.id === selectedCompanyId);
            if (!selected) return null;

            const supplierRels = filteredRelationships.filter((r) => r.customerId === selectedCompanyId);
            const customerRels = filteredRelationships.filter((r) => r.supplierId === selectedCompanyId);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white">
                    {SUPPLY_CHAIN_COUNTRIES[selected.countryCode]?.flag} {selected.name}
                  </h4>
                  <button
                    onClick={() => onSelectCompany?.(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Clear selection
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Suppliers */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Suppliers ({supplierRels.length})
                    </h5>
                    <div className="space-y-1">
                      {supplierRels.map((rel) => (
                        <div
                          key={rel.id}
                          className={`flex items-center justify-between p-2 rounded text-sm ${
                            rel.geopoliticalRisk === 'high'
                              ? 'bg-red-500/10 border border-red-500/30'
                              : 'bg-space-700'
                          }`}
                        >
                          <span className="text-slate-300">{rel.supplierName}</span>
                          {rel.geopoliticalRisk === 'high' && (
                            <span className="text-xs text-red-400">⚠️</span>
                          )}
                        </div>
                      ))}
                      {supplierRels.length === 0 && (
                        <p className="text-xs text-slate-500">No tracked suppliers</p>
                      )}
                    </div>
                  </div>

                  {/* Customers */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Customers ({customerRels.length})
                    </h5>
                    <div className="space-y-1">
                      {customerRels.map((rel) => (
                        <div
                          key={rel.id}
                          className="flex items-center justify-between p-2 rounded text-sm bg-space-700"
                        >
                          <span className="text-slate-300">{rel.customerName}</span>
                          {rel.annualValue && (
                            <span className="text-xs text-green-400">
                              ${(rel.annualValue / 1000000).toFixed(0)}M
                            </span>
                          )}
                        </div>
                      ))}
                      {customerRels.length === 0 && (
                        <p className="text-xs text-slate-500">No tracked customers</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
