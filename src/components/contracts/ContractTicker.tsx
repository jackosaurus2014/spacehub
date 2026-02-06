'use client';

import { useState, useEffect, useRef } from 'react';
import {
  GovernmentContract,
  CONTRACT_AGENCIES,
  CONTRACT_TYPES,
  CONTRACT_STATUS_INFO,
  ContractAgency,
} from '@/lib/government-contracts-data';
import ContractCard from './ContractCard';

interface ContractTickerProps {
  onFilterChange?: (agency: ContractAgency | '') => void;
}

export default function ContractTicker({ onFilterChange }: ContractTickerProps) {
  const [contracts, setContracts] = useState<GovernmentContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedContract, setSelectedContract] = useState<GovernmentContract | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<ContractAgency | ''>('');
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/government-contracts?recent=true&limit=15');
      const data = await res.json();
      if (data.contracts) {
        setContracts(data.contracts);
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgencyFilter = (agency: ContractAgency | '') => {
    setSelectedAgency(agency);
    if (onFilterChange) {
      onFilterChange(agency);
    }
  };

  const getAgencyStyle = (agency: ContractAgency) => {
    const agencyInfo = CONTRACT_AGENCIES.find((a) => a.value === agency);
    return agencyInfo ? `${agencyInfo.bgColor} ${agencyInfo.color}` : 'bg-gray-600 text-gray-200';
  };

  const getStatusStyle = (status: string) => {
    const statusInfo = CONTRACT_STATUS_INFO[status as keyof typeof CONTRACT_STATUS_INFO];
    return statusInfo ? `${statusInfo.bgColor}` : 'bg-gray-600';
  };

  const getTypeInfo = (type: string) => {
    return CONTRACT_TYPES.find((t) => t.value === type);
  };

  const formatValue = (value: string | null) => {
    if (!value) return 'TBD';
    return value;
  };

  const truncateTitle = (title: string, maxLength: number = 45) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  // Filter contracts by selected agency
  const filteredContracts = selectedAgency
    ? contracts.filter((c) => c.agency === selectedAgency)
    : contracts;

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-center h-16">
          <div className="animate-pulse flex items-center gap-2">
            <div className="w-3 h-3 bg-nebula-500 rounded-full animate-bounce"></div>
            <span className="text-slate-400 text-sm">Loading contracts...</span>
          </div>
        </div>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-200 font-semibold flex items-center gap-2">
            <span className="text-lg">🏛️</span>
            Government Contracts
          </h3>
        </div>
        <p className="text-slate-400 text-sm text-center py-4">
          No contracts available. Initialize the contracts database to see opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-700">
        <h3 className="text-slate-200 font-semibold flex items-center gap-2">
          <span className="text-lg">🏛️</span>
          Government Contract Ticker
        </h3>

        {/* Agency Filter Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAgencyFilter('')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedAgency === ''
                ? 'bg-nebula-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            All
          </button>
          {CONTRACT_AGENCIES.map((agency) => (
            <button
              key={agency.value}
              onClick={() => handleAgencyFilter(agency.value)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedAgency === agency.value
                  ? `${agency.bgColor} text-white`
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {agency.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrolling Ticker */}
      <div
        ref={tickerRef}
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`flex gap-4 py-3 px-4 ${
            isPaused ? '' : 'animate-ticker'
          }`}
          style={{
            width: 'max-content',
          }}
        >
          {/* Duplicate contracts for seamless loop */}
          {[...filteredContracts, ...filteredContracts].map((contract, index) => {
            const typeInfo = getTypeInfo(contract.type);
            const statusInfo = CONTRACT_STATUS_INFO[contract.status as keyof typeof CONTRACT_STATUS_INFO];

            return (
              <button
                key={`${contract.id}-${index}`}
                onClick={() => setSelectedContract(contract)}
                className="flex items-center gap-3 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 hover:border-nebula-500/50 hover:bg-slate-800/50 transition-all cursor-pointer min-w-max"
              >
                {/* Agency Badge */}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getAgencyStyle(contract.agency)}`}>
                  {contract.agency}
                </span>

                {/* Title */}
                <span className="text-slate-200 text-sm font-medium">
                  {truncateTitle(contract.title)}
                </span>

                {/* Type Badge */}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo?.color || 'bg-gray-600'} text-white`}>
                  {contract.type}
                </span>

                {/* Value */}
                <span className="text-green-400 text-sm font-semibold">
                  {formatValue(contract.value)}
                </span>

                {/* Status Badge */}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(contract.status)} text-white`}>
                  {statusInfo?.label || contract.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ticker Animation Styles */}
      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker 60s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Contract Detail Modal */}
      {selectedContract && (
        <ContractCard
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </div>
  );
}
