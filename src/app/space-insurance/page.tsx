'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  InsurancePolicy,
  InsuranceMarketData,
  InsuranceMissionType,
  INSURANCE_MISSION_TYPES,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SkeletonPage } from '@/components/ui/Skeleton';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface InsuranceStats {
  totalPremiums: number;
  avgLossRatio: number;
  activePolicies: number;
  largestClaim: number;
}

interface InsuranceData {
  policies: InsurancePolicy[];
  marketHistory: InsuranceMarketData[];
  stats: InsuranceStats | null;
}

// Premium rate benchmarks mirrored from the data layer for the calculator tab
const PREMIUM_RATE_BENCHMARKS: {
  type: string;
  label: string;
  icon: string;
  baseRate: number;
  riskMultiplier: number;
  effectiveRate: number;
  description: string;
}[] = [
  {
    type: 'launch',
    label: 'Launch',
    icon: '🚀',
    baseRate: 8.5,
    riskMultiplier: 1.0,
    effectiveRate: 8.5,
    description: 'Pre-launch through orbit injection. Highest risk window covering ascent, separation, and early operations.',
  },
  {
    type: 'in_orbit',
    label: 'In-Orbit',
    icon: '🛰️',
    baseRate: 5.5,
    riskMultiplier: 0.8,
    effectiveRate: 4.4,
    description: 'Operational phase coverage for on-station satellites including power, propulsion, and payload subsystems.',
  },
  {
    type: 'liability',
    label: 'Liability',
    icon: '⚖️',
    baseRate: 3.0,
    riskMultiplier: 0.6,
    effectiveRate: 1.8,
    description: 'Third-party liability for launch and operations as required by national licensing authorities.',
  },
  {
    type: 'third_party',
    label: 'Third Party',
    icon: '👥',
    baseRate: 2.5,
    riskMultiplier: 0.5,
    effectiveRate: 1.25,
    description: 'Coverage for damage to third-party property or persons from launch debris or re-entry.',
  },
  {
    type: 'ground',
    label: 'Ground Risk',
    icon: '🏗️',
    baseRate: 1.8,
    riskMultiplier: 0.4,
    effectiveRate: 0.72,
    description: 'Pre-launch ground segment coverage including assembly, integration, testing, and transport.',
  },
];

// ── Export column definitions ──

const POLICY_EXPORT_COLUMNS = [
  { key: 'missionName', label: 'Mission Name' },
  { key: 'insurer', label: 'Insurer' },
  { key: 'missionType', label: 'Mission Type' },
  { key: 'status', label: 'Status' },
  { key: 'premiumAmount', label: 'Premium Amount' },
  { key: 'premiumRate', label: 'Premium Rate' },
  { key: 'coverageType', label: 'Coverage Type' },
  { key: 'insuredValue', label: 'Insured Value' },
  { key: 'maxPayout', label: 'Max Payout' },
  { key: 'deductible', label: 'Deductible' },
  { key: 'operator', label: 'Operator' },
  { key: 'launchVehicle', label: 'Launch Vehicle' },
  { key: 'claimFiled', label: 'Claim Filed' },
  { key: 'claimAmount', label: 'Claim Amount' },
  { key: 'claimPaid', label: 'Claim Paid Amount' },
  { key: 'claimReason', label: 'Claim Reason' },
];

const MARKET_EXPORT_COLUMNS = [
  { key: 'year', label: 'Year' },
  { key: 'totalPremiums', label: 'Total Premiums' },
  { key: 'totalClaims', label: 'Total Claims' },
  { key: 'lossRatio', label: 'Loss Ratio' },
  { key: 'marketCapacity', label: 'Market Capacity' },
  { key: 'numberOfPolicies', label: 'Active Policies' },
  { key: 'avgPremiumRate', label: 'Avg Premium Rate' },
  { key: 'largestClaim', label: 'Largest Claim' },
];

// ── Known operators for cross-module linking ──

const KNOWN_OPERATORS = [
  'SpaceX', 'Arianespace', 'ULA', 'Rocket Lab', 'Blue Origin',
  'OneWeb', 'SES', 'Intelsat', 'Telesat', 'Viasat', 'Eutelsat',
  'Iridium', 'Hughes', 'Amazon', 'Boeing', 'Northrop Grumman',
  'L3Harris', 'Maxar', 'Planet Labs', 'BlackSky', 'Spire',
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(1)}M`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    case 'expired':
      return 'bg-star-500/20 text-slate-400 border border-star-500/30';
    case 'claimed':
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'settled':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    default:
      return 'bg-slate-100 text-slate-500';
  }
}

function getLossRatioColor(ratio: number): string {
  if (ratio > 100) return 'text-red-400';
  if (ratio > 70) return 'text-yellow-400';
  return 'text-green-400';
}

function getMissionTypeInfo(missionType: string) {
  return INSURANCE_MISSION_TYPES.find((t) => t.value === missionType);
}

function isKnownOperator(operator: string | null): boolean {
  if (!operator) return false;
  return KNOWN_OPERATORS.some(
    (known) => operator.toLowerCase().includes(known.toLowerCase())
  );
}

// ────────────────────────────────────────
// Market Year Card
// ────────────────────────────────────────

function MarketYearCard({
  year,
  maxPremium,
}: {
  year: InsuranceMarketData;
  maxPremium: number;
}) {
  const premiumWidth = maxPremium > 0 ? (year.totalPremiums / maxPremium) * 100 : 0;
  const claimsWidth = maxPremium > 0 ? (year.totalClaims / maxPremium) * 100 : 0;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-xl font-display font-bold text-slate-900">{year.year}</h4>
          <span className="text-slate-400 text-xs">Fiscal Year</span>
        </div>
        <div className="text-right">
          <span
            className={`text-lg font-bold ${getLossRatioColor(year.lossRatio)}`}
          >
            {year.lossRatio.toFixed(1)}%
          </span>
          <span className="text-slate-400 text-xs block">Loss Ratio</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <span className="text-slate-400 text-xs block">Total Premiums</span>
          <span className="text-nebula-300 font-bold text-sm">
            {formatCurrency(year.totalPremiums)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">Market Capacity</span>
          <span className="text-slate-900 font-bold text-sm">
            ${year.marketCapacity.toFixed(1)}B
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">Active Policies</span>
          <span className="text-slate-900 font-bold text-sm">
            {year.numberOfPolicies}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">Avg Rate</span>
          <span className="text-slate-900 font-bold text-sm">
            {year.avgPremiumRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Premium vs Claims bars */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-16">Premiums</span>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-nebula-500 to-nebula-400 rounded-full transition-all"
              style={{ width: `${Math.min(premiumWidth, 100)}%` }}
            />
          </div>
          <span className="text-xs text-nebula-300 w-16 text-right font-mono">
            {formatCurrency(year.totalPremiums)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-16">Claims</span>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all"
              style={{ width: `${Math.min(claimsWidth, 100)}%` }}
            />
          </div>
          <span className="text-xs text-red-400 w-16 text-right font-mono">
            {formatCurrency(year.totalClaims)}
          </span>
        </div>
      </div>

      {/* Premium breakdown */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-200 text-xs">
        {year.launchPremiums !== null && (
          <span className="text-slate-400">
            Launch: <span className="text-slate-400 font-medium">{formatCurrency(year.launchPremiums)}</span>
          </span>
        )}
        {year.inOrbitPremiums !== null && (
          <span className="text-slate-400">
            In-Orbit: <span className="text-slate-400 font-medium">{formatCurrency(year.inOrbitPremiums)}</span>
          </span>
        )}
        {year.liabilityPremiums !== null && (
          <span className="text-slate-400">
            Liability: <span className="text-slate-400 font-medium">{formatCurrency(year.liabilityPremiums)}</span>
          </span>
        )}
        {year.largestClaim !== null && (
          <span className="text-slate-400">
            Largest Claim: <span className="text-red-400 font-medium">{formatCurrency(year.largestClaim)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Policy Card
// ────────────────────────────────────────

function PolicyCard({ policy }: { policy: InsurancePolicy }) {
  const missionInfo = getMissionTypeInfo(policy.missionType);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{missionInfo?.icon || '🛡️'}</span>
            <h4 className="font-semibold text-slate-900 text-sm truncate">
              {policy.missionName || 'Unnamed Policy'}
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {missionInfo?.label || policy.missionType}
            </span>
            <span className="text-slate-400">{policy.insurer}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${getStatusColor(policy.status)}`}
            >
              {policy.status}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className="text-slate-900 font-bold text-sm">
            {formatCurrency(policy.insuredValue)}
          </div>
          <div className="text-slate-400 text-xs">Insured Value</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-slate-400 block">Premium</span>
          <span className="text-nebula-300 font-bold">
            {formatCurrency(policy.premiumAmount)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Rate</span>
          <span className="text-slate-900 font-medium font-mono">
            {policy.premiumRate.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Coverage</span>
          <span className="text-slate-900 font-medium capitalize">
            {policy.coverageType}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Year</span>
          <span className="text-slate-900 font-medium">{policy.yearWritten}</span>
        </div>
      </div>

      {/* Additional details + cross-module links */}
      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-200 text-xs text-slate-400">
        {policy.operator && (
          <span>
            Operator:{' '}
            {isKnownOperator(policy.operator) ? (
              <Link
                href={`/market-intel?search=${encodeURIComponent(policy.operator)}`}
                className="text-nebula-300 hover:text-nebula-200 underline underline-offset-2 font-medium transition-colors"
              >
                {policy.operator}
              </Link>
            ) : (
              <span className="text-slate-400 font-medium">{policy.operator}</span>
            )}
          </span>
        )}
        {policy.launchVehicle && (
          <span>
            Vehicle:{' '}
            <Link
              href="/resource-exchange"
              className="text-nebula-300 hover:text-nebula-200 underline underline-offset-2 font-medium transition-colors"
              title="View launch providers in Resource Exchange"
            >
              {policy.launchVehicle}
            </Link>
          </span>
        )}
        {policy.deductible !== null && (
          <span>
            Deductible: <span className="text-slate-400 font-medium">{formatCurrency(policy.deductible)}</span>
          </span>
        )}
        {policy.maxPayout !== null && (
          <span>
            Max Payout: <span className="text-slate-400 font-medium">{formatCurrency(policy.maxPayout)}</span>
          </span>
        )}
      </div>

      {/* Claim info if filed */}
      {policy.claimFiled && (
        <div className="mt-3 p-3 bg-red-900/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-red-400">Claim Filed</span>
            {policy.claimPaid !== null && (
              <span className="text-xs text-blue-400">
                Paid: {formatCurrency(policy.claimPaid)}
              </span>
            )}
            {policy.claimAmount !== null && (
              <span className="text-xs text-slate-400">
                (of {formatCurrency(policy.claimAmount)} claimed)
              </span>
            )}
          </div>
          {policy.claimReason && (
            <p className="text-slate-400 text-xs leading-relaxed">{policy.claimReason}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Inner Content (uses useSearchParams)
// ────────────────────────────────────────

function InsuranceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const initialTab = (searchParams.get('tab') as 'market' | 'policies' | 'calculator') || 'market';
  const initialType = (searchParams.get('type') as InsuranceMissionType | '') || '';

  const [data, setData] = useState<InsuranceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'market' | 'policies' | 'calculator'>(
    ['market', 'policies', 'calculator'].includes(initialTab) ? initialTab : 'market'
  );
  const [policyTypeFilter, setPolicyTypeFilter] = useState<InsuranceMissionType | ''>(
    ['launch', 'in_orbit', 'liability', 'third_party', 'ground', ''].includes(initialType) ? initialType : ''
  );

  // ── URL sync helper ──

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (!value || (key === 'tab' && value === 'market') || (key === 'type' && value === '')) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const handleTabChange = useCallback(
    (tab: 'market' | 'policies' | 'calculator') => {
      setActiveTab(tab);
      updateUrl({ tab, type: tab === 'policies' ? policyTypeFilter : '' });
    },
    [updateUrl, policyTypeFilter]
  );

  const handleTypeFilterChange = useCallback(
    (type: InsuranceMissionType | '') => {
      setPolicyTypeFilter(type);
      updateUrl({ type });
    },
    [updateUrl]
  );

  // ── Data fetching ──

  const fetchData = async () => {
    setError(null);
    try {
      const res = await fetch('/api/space-insurance?limit=50');
      const result = await res.json();

      if (!result.error) {
        setData({
          policies: result.policies || [],
          marketHistory: result.marketHistory || [],
          stats: result.stats || null,
        });
      }
    } catch (error) {
      console.error('Failed to fetch space insurance data:', error);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/space-insurance/init', { method: 'POST' });
      setLoading(true);
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize space insurance data:', error);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Derived values ──

  const policies = data?.policies || [];
  const marketHistory = data?.marketHistory || [];
  const stats = data?.stats;
  const needsInit = !loading && (!stats || (stats.totalPremiums === 0 && stats.activePolicies === 0));

  // Filtered policies
  const filteredPolicies = policyTypeFilter
    ? policies.filter((p) => p.missionType === policyTypeFilter)
    : policies;

  // Policy aggregate stats
  const totalCoverage = filteredPolicies.reduce((sum, p) => sum + p.insuredValue, 0);
  const totalPremiumAmount = filteredPolicies.reduce((sum, p) => sum + p.premiumAmount, 0);

  // Market history max premium for bar widths
  const maxPremium = Math.max(...marketHistory.map((y) => y.totalPremiums), 1);

  // Latest year data for summary banner
  const latestYear = marketHistory.length > 0 ? marketHistory[marketHistory.length - 1] : null;

  // Max effective rate for calculator bar widths
  const maxEffectiveRate = Math.max(...PREMIUM_RATE_BENCHMARKS.map((b) => b.effectiveRate), 1);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Insurance & Risk Assessment"
          subtitle="Comprehensive view of the space insurance market, active policies, and premium rate benchmarks"
          icon="🛡️"
          accentColor="amber"
        />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {loading ? (
          <SkeletonPage statCards={4} contentCards={3} />
        ) : needsInit ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">🛡️</span>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              No Insurance Data Available
            </h2>
            <p className="text-slate-400 mb-6 max-w-lg mx-auto">
              Load space insurance market data including historical premiums, active
              policies, and premium rate benchmarks.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="btn-primary py-3 px-8"
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
        ) : (
          <>
            {/* ──────────── Quick Stats ──────────── */}
            <ScrollReveal><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-nebula-300">
                  {stats ? formatCurrency(stats.totalPremiums) : '--'}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Total Market Size
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div
                  className={`text-2xl font-bold font-display ${
                    stats ? getLossRatioColor(stats.avgLossRatio) : 'text-slate-900'
                  }`}
                >
                  {stats ? `${stats.avgLossRatio.toFixed(1)}%` : '--'}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Avg Loss Ratio
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-green-400">
                  {stats?.activePolicies ?? '--'}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Active Policies
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-slate-900">
                  {policies.length > 0
                    ? formatCurrency(
                        policies.reduce((sum, p) => sum + p.insuredValue, 0)
                      )
                    : '--'}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Total Coverage
                </div>
              </div>
            </div></ScrollReveal>

            {/* ──────────── Tab Navigation ──────────── */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {[
                { id: 'market' as const, label: 'Market Overview', count: marketHistory.length },
                { id: 'policies' as const, label: 'Active Policies', count: policies.length },
                { id: 'calculator' as const, label: 'Premium Calculator' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-nebula-500 text-slate-900 shadow-glow-sm'
                      : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100/50'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id
                          ? 'bg-slate-200 text-slate-900'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ──────────── MARKET OVERVIEW TAB ──────────── */}
            {activeTab === 'market' && (
              <div className="space-y-6">
                {/* Latest Year Summary Banner */}
                {latestYear && (
                  <div className="card-elevated p-6 border border-nebula-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📊</span>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {latestYear.year} Market Summary
                          </h3>
                          <p className="text-slate-400 text-sm">
                            Latest fiscal year performance snapshot
                          </p>
                        </div>
                      </div>
                      <ExportButton
                        data={marketHistory}
                        filename="space-insurance-market-history"
                        columns={MARKET_EXPORT_COLUMNS}
                        label="Export Market Data"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Total Premiums</span>
                        <span className="text-nebula-300 font-bold text-lg">
                          {formatCurrency(latestYear.totalPremiums)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Total Claims</span>
                        <span className="text-red-400 font-bold text-lg">
                          {formatCurrency(latestYear.totalClaims)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Loss Ratio</span>
                        <span
                          className={`font-bold text-lg ${getLossRatioColor(latestYear.lossRatio)}`}
                        >
                          {latestYear.lossRatio.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Capacity</span>
                        <span className="text-slate-900 font-bold text-lg">
                          ${latestYear.marketCapacity.toFixed(1)}B
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Policies</span>
                        <span className="text-slate-900 font-bold text-lg">
                          {latestYear.numberOfPolicies}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Avg Rate</span>
                        <span className="text-slate-900 font-bold text-lg">
                          {latestYear.avgPremiumRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Year-by-Year Cards */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span>📈</span> Annual Market History
                  </h3>
                  <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[...marketHistory].reverse().map((year) => (
                      <StaggerItem key={year.id}>
                        <MarketYearCard
                          year={year}
                          maxPremium={maxPremium}
                        />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>

                {/* Risk Factor Links */}
                <div className="card p-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    Active Risk Factors
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Link href="/debris-monitor" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                      <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">🛰️ Debris Monitor</div>
                      <p className="text-xs text-slate-400 mt-1">Orbital debris increases collision risk and claims</p>
                    </Link>
                    <Link href="/solar-flares" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                      <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">☀️ Solar Activity</div>
                      <p className="text-xs text-slate-400 mt-1">Solar storms affect satellite operations</p>
                    </Link>
                    <Link href="/compliance?tab=regulations" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                      <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">📋 Compliance</div>
                      <p className="text-xs text-slate-400 mt-1">Liability regulations and requirements</p>
                    </Link>
                  </div>
                </div>

                {/* Trend Insight Card */}
                {marketHistory.length >= 2 && (
                  <div className="card p-5 border-dashed">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">
                      Market Trend Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <h4 className="text-slate-900 font-medium mb-2">Premium Growth</h4>
                        <p className="text-slate-400">
                          Total premiums grew from {formatCurrency(marketHistory[0].totalPremiums)} in{' '}
                          {marketHistory[0].year} to{' '}
                          {formatCurrency(marketHistory[marketHistory.length - 1].totalPremiums)} in{' '}
                          {marketHistory[marketHistory.length - 1].year}, representing a{' '}
                          <span className="text-nebula-300 font-medium">
                            {(
                              ((marketHistory[marketHistory.length - 1].totalPremiums -
                                marketHistory[0].totalPremiums) /
                                marketHistory[0].totalPremiums) *
                              100
                            ).toFixed(1)}
                            %
                          </span>{' '}
                          increase.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-slate-900 font-medium mb-2">Market Capacity</h4>
                        <p className="text-slate-400">
                          Industry capacity expanded from ${marketHistory[0].marketCapacity.toFixed(1)}B
                          to ${marketHistory[marketHistory.length - 1].marketCapacity.toFixed(1)}B, reflecting
                          growing confidence from underwriters and reinsurers.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-slate-900 font-medium mb-2">Loss Experience</h4>
                        <p className="text-slate-400">
                          The{' '}
                          {marketHistory.find((y) => y.lossRatio > 100)
                            ? `${marketHistory.find((y) => y.lossRatio > 100)!.year} loss ratio of ${marketHistory.find((y) => y.lossRatio > 100)!.lossRatio.toFixed(1)}% was driven by exceptional claims, but the market has since stabilized.`
                            : 'market has maintained healthy loss ratios below 100% across all tracked years.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ──────────── ACTIVE POLICIES TAB ──────────── */}
            {activeTab === 'policies' && (
              <div>
                {/* Filter Bar */}
                <div className="card p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 text-sm mr-2">Filter by type:</span>
                    <button
                      onClick={() => handleTypeFilterChange('')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        policyTypeFilter === ''
                          ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                          : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      All ({policies.length})
                    </button>
                    {(
                      ['launch', 'in_orbit', 'liability', 'third_party'] as InsuranceMissionType[]
                    ).map((type) => {
                      const info = getMissionTypeInfo(type);
                      const count = policies.filter((p) => p.missionType === type).length;
                      return (
                        <button
                          key={type}
                          onClick={() => handleTypeFilterChange(type)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                            policyTypeFilter === type
                              ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                              : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span>{info?.icon}</span>
                          {info?.label || type} ({count})
                        </button>
                      );
                    })}
                    <div className="ml-auto">
                      <ExportButton
                        data={filteredPolicies}
                        filename="space-insurance-policies"
                        columns={POLICY_EXPORT_COLUMNS}
                        label="Export Policies"
                      />
                    </div>
                  </div>
                </div>

                {/* Aggregate Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-slate-900">{filteredPolicies.length}</div>
                    <div className="text-slate-400 text-xs">Policies Shown</div>
                  </div>
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-nebula-300">
                      {formatCurrency(totalCoverage)}
                    </div>
                    <div className="text-slate-400 text-xs">Total Coverage</div>
                  </div>
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-green-400">
                      {formatCurrency(totalPremiumAmount)}
                    </div>
                    <div className="text-slate-400 text-xs">Total Premiums</div>
                  </div>
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-slate-900">
                      {filteredPolicies.length > 0
                        ? (
                            filteredPolicies.reduce((sum, p) => sum + p.premiumRate, 0) /
                            filteredPolicies.length
                          ).toFixed(2)
                        : '0.00'}
                      %
                    </div>
                    <div className="text-slate-400 text-xs">Avg Premium Rate</div>
                  </div>
                </div>

                {/* Policy Cards */}
                {filteredPolicies.length === 0 ? (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Policies Found</h3>
                    <p className="text-slate-400">
                      {policyTypeFilter
                        ? `No ${getMissionTypeInfo(policyTypeFilter)?.label || policyTypeFilter} policies in the database.`
                        : 'No policies available.'}
                    </p>
                  </div>
                ) : (
                  <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredPolicies.map((policy) => (
                      <StaggerItem key={policy.id}>
                        <PolicyCard policy={policy} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}
              </div>
            )}

            {/* ──────────── PREMIUM CALCULATOR TAB ──────────── */}
            {activeTab === 'calculator' && (
              <div className="space-y-6">
                {/* Intro Card */}
                <div className="card-elevated p-6 border border-nebula-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🧮</span>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        Premium Rate Benchmarks
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Industry-standard premium rates by mission type, based on historical
                        underwriting data and risk modeling
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benchmark Cards */}
                <div className="space-y-4">
                  {PREMIUM_RATE_BENCHMARKS.map((benchmark) => {
                    const barWidth =
                      maxEffectiveRate > 0
                        ? (benchmark.effectiveRate / maxEffectiveRate) * 100
                        : 0;

                    const riskColor =
                      benchmark.effectiveRate > 6
                        ? 'from-red-500 to-red-400'
                        : benchmark.effectiveRate > 3
                        ? 'from-yellow-500 to-yellow-400'
                        : benchmark.effectiveRate > 1.5
                        ? 'from-blue-500 to-blue-400'
                        : 'from-green-500 to-green-400';

                    const riskLabel =
                      benchmark.effectiveRate > 6
                        ? 'High Risk'
                        : benchmark.effectiveRate > 3
                        ? 'Elevated'
                        : benchmark.effectiveRate > 1.5
                        ? 'Standard'
                        : 'Low Risk';

                    const riskTextColor =
                      benchmark.effectiveRate > 6
                        ? 'text-red-400'
                        : benchmark.effectiveRate > 3
                        ? 'text-yellow-400'
                        : benchmark.effectiveRate > 1.5
                        ? 'text-blue-400'
                        : 'text-green-400';

                    return (
                      <div key={benchmark.type} className="card p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{benchmark.icon}</span>
                            <div>
                              <h4 className="text-slate-900 font-semibold">
                                {benchmark.label} Insurance
                              </h4>
                              <p className="text-slate-400 text-xs mt-0.5 max-w-lg">
                                {benchmark.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <span className={`text-sm font-bold px-2.5 py-1 rounded ${riskTextColor} bg-slate-100`}>
                              {riskLabel}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <span className="text-slate-400 text-xs block">Base Rate</span>
                            <span className="text-slate-900 font-bold text-lg font-mono">
                              {benchmark.baseRate.toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-xs block">Risk Multiplier</span>
                            <span className="text-slate-900 font-bold text-lg font-mono">
                              {benchmark.riskMultiplier.toFixed(1)}x
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-xs block">Effective Rate</span>
                            <span className="text-nebula-300 font-bold text-lg font-mono">
                              {benchmark.effectiveRate.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        {/* Visual bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${riskColor} rounded-full transition-all`}
                              style={{ width: `${Math.min(barWidth, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-16 text-right font-mono">
                            {benchmark.effectiveRate.toFixed(2)}%
                          </span>
                        </div>

                        {/* Example calculation */}
                        <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-400">
                          <span>
                            Example: $100M insured value ={' '}
                            <span className="text-nebula-300 font-bold">
                              {formatCurrency(100 * (benchmark.effectiveRate / 100))} premium
                            </span>
                          </span>
                          <span className="mx-3">|</span>
                          <span>
                            $500M insured value ={' '}
                            <span className="text-nebula-300 font-bold">
                              {formatCurrency(500 * (benchmark.effectiveRate / 100))} premium
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comparative Summary */}
                <div className="card p-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Rate Comparison Overview
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 text-xs border-b border-space-600">
                          <th className="text-left py-2 pr-4">Mission Type</th>
                          <th className="text-right py-2 pr-4">Base Rate</th>
                          <th className="text-right py-2 pr-4">Multiplier</th>
                          <th className="text-right py-2 pr-4">Effective Rate</th>
                          <th className="text-right py-2 pr-4">$100M Premium</th>
                          <th className="text-right py-2">$500M Premium</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PREMIUM_RATE_BENCHMARKS.map((b) => (
                          <tr
                            key={b.type}
                            className="border-b border-space-700/50 hover:bg-slate-100/20"
                          >
                            <td className="py-2.5 pr-4 text-slate-900 font-medium">
                              <span className="mr-2">{b.icon}</span>
                              {b.label}
                            </td>
                            <td className="py-2.5 pr-4 text-right text-slate-400 font-mono">
                              {b.baseRate.toFixed(1)}%
                            </td>
                            <td className="py-2.5 pr-4 text-right text-slate-400 font-mono">
                              {b.riskMultiplier.toFixed(1)}x
                            </td>
                            <td className="py-2.5 pr-4 text-right text-nebula-300 font-mono font-bold">
                              {b.effectiveRate.toFixed(2)}%
                            </td>
                            <td className="py-2.5 pr-4 text-right text-slate-400 font-mono">
                              {formatCurrency(100 * (b.effectiveRate / 100))}
                            </td>
                            <td className="py-2.5 text-right text-slate-400 font-mono">
                              {formatCurrency(500 * (b.effectiveRate / 100))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Find Insurance Professionals */}
                <div className="card p-5 border border-nebula-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-slate-900 font-semibold mb-1">Need Insurance Expertise?</h3>
                      <p className="text-slate-400 text-sm">
                        Find space insurance underwriters, brokers, and risk assessment professionals.
                      </p>
                    </div>
                    <Link
                      href="/workforce?tab=jobs&category=legal"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors whitespace-nowrap"
                    >
                      Find insurance professionals
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="card p-5 border-dashed">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    Methodology & Disclaimer
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                    <div>
                      <h4 className="text-slate-900 font-medium mb-2">Rate Derivation</h4>
                      <ul className="space-y-1">
                        <li>Base rates derived from 5-year market averages</li>
                        <li>Risk multipliers reflect actuarial loss experience</li>
                        <li>Effective rate = Base Rate x Risk Multiplier</li>
                        <li>Rates updated annually based on market conditions</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-slate-900 font-medium mb-2">Important Notes</h4>
                      <ul className="space-y-1">
                        <li>Benchmark rates are indicative only</li>
                        <li>Actual premiums vary by mission specifics</li>
                        <li>Underwriter assessment required for binding quotes</li>
                        <li>Rates subject to market capacity and claims experience</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page (with Suspense boundary)
// ────────────────────────────────────────

export default function SpaceInsurancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <div className="container mx-auto px-4">
            <PageHeader
              title="Space Insurance & Risk Assessment"
              subtitle="Comprehensive view of the space insurance market, active policies, and premium rate benchmarks"
              breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Space Insurance' }]}
            />
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </div>
      }
    >
      <InsuranceContent />
    </Suspense>
  );
}
