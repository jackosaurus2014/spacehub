'use client';

import { useEffect, useRef } from 'react';
import {
  GovernmentContract,
  CONTRACT_AGENCIES,
  CONTRACT_TYPES,
  CONTRACT_STATUS_INFO,
  CONTRACT_CATEGORIES,
} from '@/lib/government-contracts-data';

interface ContractCardProps {
  contract: GovernmentContract;
  onClose: () => void;
}

export default function ContractCard({ contract, onClose }: ContractCardProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const agencyInfo = CONTRACT_AGENCIES.find((a) => a.value === contract.agency);
  const typeInfo = CONTRACT_TYPES.find((t) => t.value === contract.type);
  const statusInfo = CONTRACT_STATUS_INFO[contract.status as keyof typeof CONTRACT_STATUS_INFO];
  const categoryInfo = CONTRACT_CATEGORIES.find((c) => c.value === contract.category);

  const formatDate = (date: Date | null) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilDue = (dueDate: Date | null) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysUntilDue = getDaysUntilDue(contract.dueDate);

  const getSAMUrl = () => {
    if (contract.sourceUrl) return contract.sourceUrl;
    if (contract.solicitationNumber) {
      return `https://sam.gov/opp/${contract.solicitationNumber}`;
    }
    return 'https://sam.gov';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Agency Badge */}
            <div className={`px-3 py-1.5 rounded-lg ${agencyInfo?.bgColor || 'bg-gray-600'}`}>
              <span className={`font-bold text-lg ${agencyInfo?.color || 'text-white'}`}>
                {contract.agency}
              </span>
            </div>
            <div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo?.color || 'bg-gray-600'} text-white`}>
                {contract.type}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-3">{contract.title}</h2>

          {/* Status and Value Row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo?.bgColor || 'bg-gray-600'} text-white`}>
              {statusInfo?.label || contract.status}
            </span>
            {contract.value && (
              <span className="text-green-400 font-bold text-lg">{contract.value}</span>
            )}
            {categoryInfo && (
              <span className="text-slate-400 text-sm bg-slate-800 px-2 py-1 rounded">
                {categoryInfo.label}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-slate-300 mb-6 leading-relaxed">{contract.description}</p>

          {/* Timeline */}
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
            <h3 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
              <span>📅</span> Timeline
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Posted</div>
                <div className="text-slate-200 font-medium">{formatDate(contract.postedDate)}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Due Date</div>
                <div className={`font-medium ${daysUntilDue !== null && daysUntilDue <= 14 ? 'text-yellow-400' : 'text-slate-200'}`}>
                  {formatDate(contract.dueDate)}
                  {daysUntilDue !== null && daysUntilDue > 0 && (
                    <span className={`block text-xs ${daysUntilDue <= 14 ? 'text-yellow-400' : 'text-slate-400'}`}>
                      ({daysUntilDue} days)
                    </span>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Award Date</div>
                <div className="text-slate-200 font-medium">{formatDate(contract.awardDate)}</div>
              </div>
            </div>

            {/* Progress Bar for Open Contracts */}
            {contract.status === 'open' && contract.dueDate && contract.postedDate && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Posted</span>
                  <span>Due</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          ((new Date().getTime() - new Date(contract.postedDate).getTime()) /
                            (new Date(contract.dueDate).getTime() - new Date(contract.postedDate).getTime())) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {contract.solicitationNumber && (
              <div className="bg-slate-800/30 rounded-lg p-3">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Solicitation #</div>
                <div className="text-slate-200 font-mono text-sm">{contract.solicitationNumber}</div>
              </div>
            )}
            {contract.naicsCode && (
              <div className="bg-slate-800/30 rounded-lg p-3">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">NAICS Code</div>
                <div className="text-slate-200 font-mono text-sm">{contract.naicsCode}</div>
              </div>
            )}
            {contract.awardee && (
              <div className="bg-slate-800/30 rounded-lg p-3 col-span-2">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Awardee</div>
                <div className="text-purple-400 font-medium">{contract.awardee}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <a
              href={getSAMUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-nebula-600 hover:bg-nebula-500 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors flex items-center justify-center gap-2"
            >
              <span>View on SAM.gov</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
