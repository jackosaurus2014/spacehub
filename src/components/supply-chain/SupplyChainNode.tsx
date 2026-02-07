'use client';

import { useState } from 'react';
import {
  SupplyChainCompany,
  SupplyRelationship,
  SUPPLY_CHAIN_TIERS,
  SUPPLY_CRITICALITY_INFO,
  SUPPLY_CHAIN_COUNTRIES,
} from '@/types';

interface SupplyChainNodeProps {
  company: SupplyChainCompany;
  relationships?: SupplyRelationship[];
  onSelectCompany?: (companyId: string) => void;
  isExpanded?: boolean;
  allCompanies?: SupplyChainCompany[];
}

export default function SupplyChainNode({
  company,
  relationships = [],
  onSelectCompany,
  isExpanded = false,
  allCompanies = [],
}: SupplyChainNodeProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  const tierInfo = SUPPLY_CHAIN_TIERS.find((t) => t.value === company.tier);
  const criticalityInfo = SUPPLY_CRITICALITY_INFO[company.criticality];
  const countryInfo = SUPPLY_CHAIN_COUNTRIES[company.countryCode] || {
    name: company.country,
    flag: '🏳️',
    risk: 'none',
  };

  // Get supplier and customer relationships
  const supplierRelations = relationships.filter((r) => r.customerId === company.id);
  const customerRelations = relationships.filter((r) => r.supplierId === company.id);

  // Get tier-based border color
  const getTierBorderColor = () => {
    switch (company.tier) {
      case 'prime':
        return 'border-blue-500/50 hover:border-blue-400';
      case 'tier1':
        return 'border-cyan-500/50 hover:border-cyan-400';
      case 'tier2':
        return 'border-green-500/50 hover:border-green-400';
      case 'tier3':
        return 'border-gray-500/50 hover:border-gray-400';
      default:
        return 'border-slate-600 hover:border-slate-500';
    }
  };

  // Get tier-based glow
  const getTierGlow = () => {
    switch (company.tier) {
      case 'prime':
        return 'shadow-blue-500/20';
      case 'tier1':
        return 'shadow-cyan-500/20';
      case 'tier2':
        return 'shadow-green-500/20';
      case 'tier3':
        return 'shadow-gray-500/20';
      default:
        return '';
    }
  };

  return (
    <div
      className={`bg-space-800 border-2 rounded-xl transition-all duration-200 ${getTierBorderColor()} ${
        expanded ? `shadow-lg ${getTierGlow()}` : ''
      }`}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Company name and country */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl" title={countryInfo.name}>
                {countryInfo.flag}
              </span>
              <h3 className="font-semibold text-white truncate">{company.name}</h3>
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Tier badge */}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${tierInfo?.bgColor}/20 ${tierInfo?.color}`}
              >
                {tierInfo?.label || company.tier}
              </span>

              {/* Criticality badge */}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${criticalityInfo.bgColor}/20 ${criticalityInfo.color}`}
              >
                {criticalityInfo.label} Criticality
              </span>

              {/* Geopolitical risk indicator */}
              {countryInfo.risk !== 'none' && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    countryInfo.risk === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : countryInfo.risk === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {countryInfo.risk === 'high' ? '⚠️' : countryInfo.risk === 'medium' ? '⚡' : '✓'} Geo Risk
                </span>
              )}
            </div>
          </div>

          {/* Expand icon */}
          <button className="text-slate-400 hover:text-white transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Products preview */}
        <div className="mt-3 flex flex-wrap gap-1">
          {company.products.slice(0, 4).map((product) => (
            <span
              key={product}
              className="text-xs bg-space-700 text-slate-300 px-2 py-0.5 rounded"
            >
              {product.replace(/_/g, ' ')}
            </span>
          ))}
          {company.products.length > 4 && (
            <span className="text-xs text-slate-400">+{company.products.length - 4} more</span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-space-700 p-4 space-y-4">
          {/* Description */}
          {company.description && (
            <p className="text-sm text-slate-400">{company.description}</p>
          )}

          {/* Company info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {company.headquarters && (
              <div>
                <span className="text-slate-400">HQ:</span>
                <span className="text-slate-300 ml-2">{company.headquarters}</span>
              </div>
            )}
            {company.employeeCount && (
              <div>
                <span className="text-slate-400">Employees:</span>
                <span className="text-slate-300 ml-2">{company.employeeCount.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Suppliers section */}
          {supplierRelations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Suppliers ({supplierRelations.length})
              </h4>
              <div className="space-y-2">
                {supplierRelations.map((rel) => (
                  <div
                    key={rel.id}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      rel.geopoliticalRisk === 'high'
                        ? 'bg-red-500/10 border border-red-500/30'
                        : 'bg-space-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{rel.supplierName}</span>
                      {rel.isCritical && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                          Critical
                        </span>
                      )}
                    </div>
                    {rel.geopoliticalRisk === 'high' && (
                      <span className="text-xs text-red-400">⚠️ High Risk</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers section */}
          {customerRelations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Customers ({customerRelations.length})
              </h4>
              <div className="space-y-2">
                {customerRelations.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-space-700"
                  >
                    <span className="text-sm text-white">{rel.customerName}</span>
                    {rel.annualValue && (
                      <span className="text-xs text-green-400">
                        ${(rel.annualValue / 1000000).toFixed(0)}M/yr
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All products */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Products & Services
            </h4>
            <div className="flex flex-wrap gap-1">
              {company.products.map((product) => (
                <span
                  key={product}
                  className="text-xs bg-space-700 text-slate-300 px-2 py-1 rounded"
                >
                  {product.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          {onSelectCompany && (
            <div className="pt-2 border-t border-space-700">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCompany(company.id);
                }}
                className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors"
              >
                View Full Supply Chain →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
