'use client';

import { useEffect, useCallback } from 'react';
import { SpaceTourismOffering, TOURISM_STATUS_LABELS, EXPERIENCE_TYPES } from '@/lib/space-tourism-data';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerings: SpaceTourismOffering[];
  onRemove: (id: string) => void;
}

export default function ComparisonModal({
  isOpen,
  onClose,
  offerings,
  onRemove,
}: ComparisonModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen || offerings.length === 0) return null;

  const comparisonRows = [
    {
      label: 'Provider',
      getValue: (o: SpaceTourismOffering) => o.provider
    },
    {
      label: 'Experience Type',
      getValue: (o: SpaceTourismOffering) => {
        const exp = EXPERIENCE_TYPES.find(e => e.value === o.experienceType);
        return `${exp?.icon || ''} ${exp?.label || o.experienceType}`;
      }
    },
    {
      label: 'Price',
      getValue: (o: SpaceTourismOffering) => o.priceDisplay,
      highlight: true
    },
    {
      label: 'Duration',
      getValue: (o: SpaceTourismOffering) => o.duration
    },
    {
      label: 'Altitude',
      getValue: (o: SpaceTourismOffering) => o.altitudeDisplay
    },
    {
      label: 'Max Passengers',
      getValue: (o: SpaceTourismOffering) => `${o.maxPassengers} people`
    },
    {
      label: 'Training Required',
      getValue: (o: SpaceTourismOffering) => o.trainingDuration
    },
    {
      label: 'Launch Site',
      getValue: (o: SpaceTourismOffering) => o.launchSite
    },
    {
      label: 'Vehicle',
      getValue: (o: SpaceTourismOffering) => o.vehicleName
    },
    {
      label: 'First Flight',
      getValue: (o: SpaceTourismOffering) => o.firstFlight || 'TBD'
    },
    {
      label: 'Status',
      getValue: (o: SpaceTourismOffering) => (TOURISM_STATUS_LABELS[o.status] || { label: o.status || 'Unknown' }).label
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl animate-scale-in"
        style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 100%)'
        }}
      >
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div>
            <h2 className="text-2xl font-display font-bold text-white">Compare Experiences</h2>
            <p className="text-slate-400 text-sm mt-1">
              Comparing {offerings.length} space tourism {offerings.length === 1 ? 'experience' : 'experiences'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comparison Content */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(90vh-120px)]">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr style={{ background: 'rgba(15, 23, 42, 0.98)' }}>
                <th className="text-left p-4 text-slate-400 text-sm font-medium border-b border-slate-700/50 min-w-[140px]">
                  Feature
                </th>
                {offerings.map((offering) => (
                  <th
                    key={offering.id}
                    className="p-4 text-center border-b border-slate-700/50 min-w-[200px]"
                  >
                    <div className="relative">
                      <button
                        onClick={() => onRemove(offering.id)}
                        className="absolute -top-1 right-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
                        title="Remove from comparison"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="w-14 h-14 mx-auto rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xl font-bold text-cyan-400 border border-slate-600/50 mb-2">
                        {offering.logoIcon}
                      </div>
                      <p className="text-cyan-400 text-sm font-medium">{offering.provider}</p>
                      <h3 className="text-white font-display font-bold">{offering.name}</h3>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, idx) => (
                <tr
                  key={row.label}
                  className={idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-transparent'}
                >
                  <td className="p-4 text-slate-400 text-sm font-medium border-r border-slate-700/30">
                    {row.label}
                  </td>
                  {offerings.map((offering) => (
                    <td
                      key={offering.id}
                      className={`p-4 text-center ${
                        row.highlight ? 'text-cyan-400 font-bold text-lg' : 'text-white'
                      }`}
                    >
                      {row.getValue(offering)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Features Row */}
              <tr className="bg-slate-800/30">
                <td className="p-4 text-slate-400 text-sm font-medium border-r border-slate-700/30 align-top">
                  Key Features
                </td>
                {offerings.map((offering) => (
                  <td key={offering.id} className="p-4 align-top">
                    <ul className="space-y-1.5 text-left">
                      {offering.features.slice(0, 5).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                      {offering.features.length > 5 && (
                        <li className="text-slate-400 text-xs">
                          +{offering.features.length - 5} more features
                        </li>
                      )}
                    </ul>
                  </td>
                ))}
              </tr>

              {/* Requirements Row */}
              <tr>
                <td className="p-4 text-slate-400 text-sm font-medium border-r border-slate-700/30 align-top">
                  Requirements
                </td>
                {offerings.map((offering) => (
                  <td key={offering.id} className="p-4 align-top">
                    <ul className="space-y-1.5 text-left">
                      {offering.requirements.slice(0, 4).map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                          <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {req}
                        </li>
                      ))}
                      {offering.requirements.length > 4 && (
                        <li className="text-slate-400 text-xs">
                          +{offering.requirements.length - 4} more requirements
                        </li>
                      )}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
          <p className="text-slate-400 text-sm">
            Tip: Select up to 4 experiences to compare side by side
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
