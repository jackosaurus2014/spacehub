'use client';

import { useState } from 'react';
import { SupplyShortage, SHORTAGE_SEVERITY_INFO, SUPPLY_CHAIN_PRODUCT_CATEGORIES } from '@/types';

interface ShortageAlertProps {
  shortage: SupplyShortage;
  isExpanded?: boolean;
}

export default function ShortageAlert({ shortage, isExpanded = false }: ShortageAlertProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  const severityInfo = SHORTAGE_SEVERITY_INFO[shortage.severity];
  const categoryInfo = SUPPLY_CHAIN_PRODUCT_CATEGORIES.find(
    (c) => c.value === shortage.category
  );

  // Get border color based on severity
  const getBorderColor = () => {
    switch (shortage.severity) {
      case 'critical':
        return 'border-red-500/50';
      case 'high':
        return 'border-orange-500/50';
      case 'medium':
        return 'border-yellow-500/50';
      case 'low':
        return 'border-green-500/50';
      default:
        return 'border-slate-600';
    }
  };

  // Get background pulse for critical items
  const getBackgroundStyle = () => {
    if (shortage.severity === 'critical') {
      return 'bg-gradient-to-r from-red-500/5 to-space-800';
    }
    return 'bg-space-800';
  };

  return (
    <div
      className={`border-2 rounded-xl transition-all duration-200 ${getBorderColor()} ${getBackgroundStyle()} hover:shadow-lg`}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Severity and category */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{severityInfo.icon}</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${severityInfo.bgColor}/20 ${severityInfo.color}`}
              >
                {severityInfo.label.toUpperCase()}
              </span>
              {categoryInfo && (
                <span className="text-xs bg-space-700 text-slate-300 px-2 py-0.5 rounded">
                  {categoryInfo.icon} {categoryInfo.label}
                </span>
              )}
            </div>

            {/* Material name */}
            <h3 className="font-semibold text-white">{shortage.material}</h3>

            {/* Brief description */}
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{shortage.notes}</p>
          </div>

          {/* Expand icon */}
          <button className="text-slate-400 hover:text-white transition-colors p-1">
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

        {/* Quick stats */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
          <span className="text-slate-500">
            <span className="text-slate-300 font-medium">{shortage.affectedProducts.length}</span> affected products
          </span>
          <span className="text-slate-500">
            <span className="text-slate-300 font-medium">{shortage.impactedCompanies.length}</span> companies impacted
          </span>
          {shortage.estimatedResolution && (
            <span className="text-slate-500">
              Est. resolution: <span className="text-nebula-400">{shortage.estimatedResolution}</span>
            </span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-space-700 p-4 space-y-4">
          {/* Affected products */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Affected Products
            </h4>
            <div className="flex flex-wrap gap-1">
              {shortage.affectedProducts.map((product) => (
                <span
                  key={product}
                  className="text-xs bg-red-500/10 text-red-300 border border-red-500/30 px-2 py-1 rounded"
                >
                  {product.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Impacted companies */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Impacted Companies
            </h4>
            <div className="flex flex-wrap gap-1">
              {shortage.impactedCompanies.map((company) => (
                <span
                  key={company}
                  className="text-xs bg-space-700 text-slate-300 px-2 py-1 rounded"
                >
                  {company.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>

          {/* Alternative suppliers */}
          {shortage.alternativeSuppliers.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Alternative Suppliers
              </h4>
              <div className="flex flex-wrap gap-1">
                {shortage.alternativeSuppliers.map((supplier) => (
                  <span
                    key={supplier}
                    className="text-xs bg-green-500/10 text-green-300 border border-green-500/30 px-2 py-1 rounded"
                  >
                    {supplier.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Geopolitical factors */}
          {shortage.geopoliticalFactors && shortage.geopoliticalFactors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Geopolitical Factors
              </h4>
              <div className="flex flex-wrap gap-1">
                {shortage.geopoliticalFactors.map((factor) => (
                  <span
                    key={factor}
                    className="text-xs bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 px-2 py-1 rounded"
                  >
                    ⚠️ {factor.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full notes */}
          <div className="pt-2 border-t border-space-700">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Analysis
            </h4>
            <p className="text-sm text-slate-300">{shortage.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
