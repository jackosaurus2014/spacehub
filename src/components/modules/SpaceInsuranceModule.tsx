'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  InsurancePolicy,
  InsuranceMarketData,
  INSURANCE_MISSION_TYPES,
  InsuranceMissionType,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface InsuranceStats {
  totalPremiums: number;
  avgLossRatio: number;
  activePolicies: number;
  largestClaim: number;
}

interface PremiumEstimate {
  premiumRate: number;
  premiumAmount: number;
  riskCategory: string;
}

export default function SpaceInsuranceModule() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [marketHistory, setMarketHistory] = useState<InsuranceMarketData[]>([]);
  const [stats, setStats] = useState<InsuranceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  // Premium calculator state
  const [calcValue, setCalcValue] = useState<string>('100');
  const [calcMissionType, setCalcMissionType] = useState<InsuranceMissionType>('launch');
  const [premiumEstimate, setPremiumEstimate] = useState<PremiumEstimate | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/space-insurance?limit=10');
      const data = await res.json();

      if (data.policies) setPolicies(data.policies);
      if (data.marketHistory) setMarketHistory(data.marketHistory);
      if (data.stats) setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch space insurance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/space-insurance/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize space insurance data:', error);
    } finally {
      setInitializing(false);
    }
  };

  const handleCalculatePremium = async () => {
    setCalculating(true);
    try {
      const value = parseFloat(calcValue);
      if (isNaN(value) || value <= 0) return;

      const res = await fetch(
        `/api/space-insurance?missionType=${calcMissionType}&limit=50`
      );
      const data = await res.json();

      // Estimate premium based on average rates for the mission type
      const relevantPolicies = (data.policies || []) as InsurancePolicy[];
      if (relevantPolicies.length > 0) {
        const avgRate =
          relevantPolicies.reduce((sum: number, p: InsurancePolicy) => sum + p.premiumRate, 0) /
          relevantPolicies.length;
        const premiumAmount = value * (avgRate / 100);

        let riskCategory = 'Standard';
        if (avgRate > 15) riskCategory = 'High Risk';
        else if (avgRate > 8) riskCategory = 'Elevated';
        else if (avgRate < 3) riskCategory = 'Low Risk';

        setPremiumEstimate({
          premiumRate: avgRate,
          premiumAmount,
          riskCategory,
        });
      }
    } catch (error) {
      console.error('Failed to calculate premium:', error);
    } finally {
      setCalculating(false);
    }
  };

  const formatCurrency = (value: number, inMillions = true) => {
    if (inMillions) {
      if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
      return `$${value.toFixed(1)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'expired':
        return 'bg-star-500/20 text-star-400 border border-star-500/30';
      case 'claimed':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'settled':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      default:
        return 'bg-space-600 text-star-300';
    }
  };

  const getMissionTypeInfo = (missionType: string) => {
    return INSURANCE_MISSION_TYPES.find((t) => t.value === missionType);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stats || (stats.totalPremiums === 0 && stats.activePolicies === 0)) {
    return (
      <div className="card p-8 text-center">
        <span className="text-5xl block mb-4">🛡️</span>
        <h3 className="text-xl font-semibold text-white mb-2">
          Space Insurance & Risk Calculator
        </h3>
        <p className="text-star-300 mb-4">
          Explore space insurance policies, market trends, and calculate mission premiums.
        </p>
        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="btn-primary"
        >
          {initializing ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Loading Data...
            </span>
          ) : (
            'Load Data'
          )}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛡️</span>
          <div>
            <h2 className="text-2xl font-display font-bold text-white">
              Space Insurance & Risk Calculator
            </h2>
            <p className="text-star-300 text-sm">
              Policies, market data & premium estimation
            </p>
          </div>
        </div>
        <Link href="/space-insurance" className="btn-secondary text-sm py-1.5 px-4">
          View All →
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-nebula-300">
            {formatCurrency(stats.totalPremiums)}
          </div>
          <div className="text-star-300 text-xs">Total Premiums</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {stats.avgLossRatio.toFixed(1)}%
          </div>
          <div className="text-star-300 text-xs">Avg Loss Ratio</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-green-400">
            {stats.activePolicies}
          </div>
          <div className="text-star-300 text-xs">Active Policies</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-red-400">
            {formatCurrency(stats.largestClaim)}
          </div>
          <div className="text-star-300 text-xs">Largest Claim</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market History */}
        <div className="lg:col-span-2 card p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📈</span> Market History
          </h3>
          <div className="space-y-2">
            {marketHistory.slice(0, 6).map((year) => {
              const maxPremium = Math.max(
                ...marketHistory.map((y) => y.totalPremiums)
              );
              const premiumWidth =
                maxPremium > 0
                  ? (year.totalPremiums / maxPremium) * 100
                  : 0;
              const claimsWidth =
                maxPremium > 0
                  ? (year.totalClaims / maxPremium) * 100
                  : 0;

              return (
                <div key={year.id} className="p-3 bg-space-700/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">
                      {year.year}
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-star-300">
                        Policies: {year.numberOfPolicies}
                      </span>
                      <span
                        className={`font-medium ${
                          year.lossRatio > 100
                            ? 'text-red-400'
                            : year.lossRatio > 70
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        }`}
                      >
                        Loss: {year.lossRatio.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Premium bar */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-star-400 w-16">Premiums</span>
                    <div className="flex-1 h-3 bg-space-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-nebula-500 to-nebula-400 rounded-full"
                        style={{ width: `${Math.min(premiumWidth, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-nebula-300 w-16 text-right">
                      {formatCurrency(year.totalPremiums)}
                    </span>
                  </div>

                  {/* Claims bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-star-400 w-16">Claims</span>
                    <div className="flex-1 h-3 bg-space-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                        style={{ width: `${Math.min(claimsWidth, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-red-400 w-16 text-right">
                      {formatCurrency(year.totalClaims)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Premium Calculator */}
        <div className="space-y-6">
          <div className="card p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🧮</span> Premium Calculator
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-star-300 text-xs block mb-1">
                  Insured Value ($M)
                </label>
                <input
                  type="number"
                  value={calcValue}
                  onChange={(e) => setCalcValue(e.target.value)}
                  className="w-full bg-space-700/50 border border-space-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-nebula-500"
                  placeholder="100"
                  min="1"
                />
              </div>
              <div>
                <label className="text-star-300 text-xs block mb-1">
                  Mission Type
                </label>
                <select
                  value={calcMissionType}
                  onChange={(e) =>
                    setCalcMissionType(e.target.value as InsuranceMissionType)
                  }
                  className="w-full bg-space-700/50 border border-space-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-nebula-500"
                >
                  {INSURANCE_MISSION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCalculatePremium}
                disabled={calculating}
                className="w-full btn-primary text-sm py-2"
              >
                {calculating ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    Calculating...
                  </span>
                ) : (
                  'Calculate Premium'
                )}
              </button>

              {premiumEstimate && (
                <div className="mt-3 p-3 bg-space-700/30 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-star-300">Est. Rate:</span>
                    <span className="text-white font-medium">
                      {premiumEstimate.premiumRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-star-300">Est. Premium:</span>
                    <span className="text-nebula-300 font-bold">
                      {formatCurrency(premiumEstimate.premiumAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-star-300">Risk Category:</span>
                    <span
                      className={`font-medium ${
                        premiumEstimate.riskCategory === 'High Risk'
                          ? 'text-red-400'
                          : premiumEstimate.riskCategory === 'Elevated'
                          ? 'text-yellow-400'
                          : premiumEstimate.riskCategory === 'Low Risk'
                          ? 'text-green-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {premiumEstimate.riskCategory}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Policies */}
      <div className="card p-4 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>📋</span> Recent Policies
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-star-400 text-xs border-b border-space-600">
                <th className="text-left py-2 pr-4">Insurer</th>
                <th className="text-left py-2 pr-4">Mission</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-right py-2 pr-4">Premium Rate</th>
                <th className="text-right py-2 pr-4">Insured Value</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.slice(0, 8).map((policy) => {
                const missionInfo = getMissionTypeInfo(policy.missionType);
                return (
                  <tr
                    key={policy.id}
                    className="border-b border-space-700/50 hover:bg-space-700/20"
                  >
                    <td className="py-2 pr-4 text-white font-medium">
                      {policy.insurer}
                    </td>
                    <td className="py-2 pr-4 text-star-200">
                      {policy.missionName || 'N/A'}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-xs bg-space-700/50 text-star-200 px-2 py-0.5 rounded">
                        {missionInfo?.icon} {missionInfo?.label || policy.missionType}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right text-nebula-300 font-mono">
                      {policy.premiumRate.toFixed(2)}%
                    </td>
                    <td className="py-2 pr-4 text-right text-star-200 font-mono">
                      {formatCurrency(policy.insuredValue)}
                    </td>
                    <td className="py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getStatusColor(
                          policy.status
                        )}`}
                      >
                        {policy.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
