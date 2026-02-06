'use client';

import { useState, useEffect } from 'react';
import {
  GovernmentContract,
  CONTRACT_AGENCIES,
  CONTRACT_TYPES,
  CONTRACT_STATUS_INFO,
  CONTRACT_CATEGORIES,
  ContractAgency,
  ContractType,
  ContractStatus,
  ContractCategory,
} from '@/lib/government-contracts-data';
import ContractCard from './ContractCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ContractsListProps {
  initialAgency?: ContractAgency | '';
}

export default function ContractsList({ initialAgency = '' }: ContractsListProps) {
  const [contracts, setContracts] = useState<GovernmentContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [selectedContract, setSelectedContract] = useState<GovernmentContract | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    openCount: number;
    awardedThisMonth: number;
    totalOpenValue: number;
    byAgency: Record<string, number>;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  } | null>(null);

  // Filters
  const [agencyFilter, setAgencyFilter] = useState<ContractAgency | ''>(initialAgency);
  const [typeFilter, setTypeFilter] = useState<ContractType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<ContractCategory | ''>('');

  useEffect(() => {
    fetchData();
  }, [agencyFilter, typeFilter, statusFilter, categoryFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agencyFilter) params.set('agency', agencyFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      params.set('limit', '50');

      const [contractsRes, statsRes] = await Promise.all([
        fetch(`/api/government-contracts?${params}`),
        fetch('/api/government-contracts?stats=true'),
      ]);

      const contractsData = await contractsRes.json();
      const statsData = await statsRes.json();

      if (contractsData.contracts) {
        setContracts(contractsData.contracts);
      }
      if (statsData.total !== undefined) {
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/government-contracts/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
    } finally {
      setInitializing(false);
    }
  };

  const formatValue = (num: number) => {
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(0)}M`;
    }
    return `$${num.toLocaleString()}`;
  };

  const getAgencyStyle = (agency: ContractAgency) => {
    const agencyInfo = CONTRACT_AGENCIES.find((a) => a.value === agency);
    return agencyInfo ? `${agencyInfo.bgColor} ${agencyInfo.color}` : 'bg-gray-600 text-gray-200';
  };

  const getStatusStyle = (status: ContractStatus) => {
    const statusInfo = CONTRACT_STATUS_INFO[status];
    return statusInfo ? statusInfo.bgColor : 'bg-gray-600';
  };

  const getTypeInfo = (type: ContractType) => {
    return CONTRACT_TYPES.find((t) => t.value === type);
  };

  const getCategoryLabel = (category: ContractCategory) => {
    const categoryInfo = CONTRACT_CATEGORIES.find((c) => c.value === category);
    return categoryInfo?.label || category;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && contracts.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (contracts.length === 0 && !stats?.total) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
        <span className="text-5xl block mb-4">🏛️</span>
        <h2 className="text-xl font-semibold text-white mb-2">No Government Contracts</h2>
        <p className="text-slate-400 mb-6">
          Initialize the database with NASA, Space Force, and ESA contracts.
        </p>
        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="bg-nebula-600 hover:bg-nebula-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          {initializing ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Initializing...
            </span>
          ) : (
            'Load Contracts'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 text-xs uppercase tracking-wider">Total Contracts</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{stats.openCount}</div>
            <div className="text-slate-400 text-xs uppercase tracking-wider">Open/Active</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{stats.awardedThisMonth}</div>
            <div className="text-slate-400 text-xs uppercase tracking-wider">Awarded (30d)</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{formatValue(stats.totalOpenValue)}</div>
            <div className="text-slate-400 text-xs uppercase tracking-wider">Open Value</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-1">Agency</label>
            <select
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value as ContractAgency | '')}
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Agencies</option>
              {CONTRACT_AGENCIES.map((agency) => (
                <option key={agency.value} value={agency.value}>
                  {agency.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ContractType | '')}
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Types</option>
              {CONTRACT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ContractStatus | '')}
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(CONTRACT_STATUS_INFO).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ContractCategory | '')}
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
            >
              <option value="">All Categories</option>
              {CONTRACT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {(agencyFilter || typeFilter || statusFilter || categoryFilter) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setAgencyFilter('');
                  setTypeFilter('');
                  setStatusFilter('');
                  setCategoryFilter('');
                }}
                className="text-sm text-nebula-400 hover:text-nebula-300 py-2 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contracts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
          <span className="text-4xl block mb-3">🔍</span>
          <h3 className="text-lg font-semibold text-white mb-2">No Results</h3>
          <p className="text-slate-400">No contracts match your filters. Try adjusting your criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => {
            const typeInfo = getTypeInfo(contract.type);
            const statusInfo = CONTRACT_STATUS_INFO[contract.status];

            return (
              <button
                key={contract.id}
                onClick={() => setSelectedContract(contract)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-nebula-500/50 hover:bg-slate-800 transition-all text-left"
              >
                <div className="flex flex-wrap items-start gap-3">
                  {/* Agency Badge */}
                  <span className={`px-2.5 py-1 rounded text-xs font-medium ${getAgencyStyle(contract.agency)}`}>
                    {contract.agency}
                  </span>

                  {/* Type Badge */}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${typeInfo?.color || 'bg-gray-600'} text-white`}>
                    {contract.type}
                  </span>

                  {/* Status Badge */}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(contract.status)} text-white`}>
                    {statusInfo?.label || contract.status}
                  </span>

                  {/* Category */}
                  <span className="px-2 py-1 rounded text-xs font-medium bg-slate-700 text-slate-300">
                    {getCategoryLabel(contract.category)}
                  </span>
                </div>

                <h3 className="text-white font-semibold mt-3 mb-2">{contract.title}</h3>
                <p className="text-slate-400 text-sm line-clamp-2 mb-3">{contract.description}</p>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {contract.value && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Value:</span>
                      <span className="text-green-400 font-semibold">{contract.value}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Posted:</span>
                    <span className="text-slate-300">{formatDate(contract.postedDate)}</span>
                  </div>
                  {contract.dueDate && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Due:</span>
                      <span className="text-yellow-400">{formatDate(contract.dueDate)}</span>
                    </div>
                  )}
                  {contract.awardee && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Awardee:</span>
                      <span className="text-purple-400">{contract.awardee}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

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
