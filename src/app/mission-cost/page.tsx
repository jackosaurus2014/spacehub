'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type OrbitType = 'LEO' | 'SSO' | 'GTO' | 'GEO' | 'Lunar' | 'Mars' | 'Beyond';
type PayloadType = 'communications' | 'earth_observation' | 'technology_demo' | 'science' | 'navigation' | 'military' | 'crewed';
type TabType = 'calculator' | 'providers' | 'insurance' | 'regulatory';

interface ProviderCostEstimate {
  providerId: string;
  providerName: string;
  vehicleName: string;
  country: string;
  minCost: number;
  maxCost: number;
  typicalCost: number;
  costPerKg: { min: number; max: number };
  supportsOrbit: boolean;
  supportsPayload: boolean;
  reliability: number;
  notes: string[];
}

interface InsuranceEstimate {
  launchInsurance: { min: number; max: number; typical: number };
  inOrbitInsurance: { min: number; max: number; typical: number };
  thirdPartyLiability: { min: number; max: number; typical: number };
  totalInsurance: { min: number; max: number; typical: number };
}

interface RegulatoryFeesEstimate {
  faaLicenseFee: number;
  fccFilingFee: number;
  noaaLicenseFee: number;
  ituFilingFee: number;
  miscFees: number;
  totalFees: number;
  notes: string[];
}

interface TotalCostSummary {
  launchCost: { min: number; max: number; typical: number };
  insurance: InsuranceEstimate | null;
  regulatoryFees: RegulatoryFeesEstimate | null;
  totalCost: { min: number; max: number; typical: number };
}

interface CostEstimateResponse {
  input: {
    payloadMass: number;
    orbitType: OrbitType;
    payloadType: PayloadType;
    payloadValue: number;
  };
  providers: ProviderCostEstimate[];
  insurance: InsuranceEstimate | null;
  regulatoryFees: RegulatoryFeesEstimate | null;
  summary: TotalCostSummary;
  generatedAt: string;
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const ORBIT_OPTIONS: { value: OrbitType; label: string; description: string; icon: string }[] = [
  { value: 'LEO', label: 'LEO', description: 'Low Earth Orbit (200-2000 km)', icon: '🌍' },
  { value: 'SSO', label: 'SSO', description: 'Sun-Synchronous Orbit', icon: '☀️' },
  { value: 'GTO', label: 'GTO', description: 'Geostationary Transfer Orbit', icon: '🔄' },
  { value: 'GEO', label: 'GEO', description: 'Geostationary Orbit (35,786 km)', icon: '📡' },
  { value: 'Lunar', label: 'Lunar', description: 'Trans-Lunar Injection', icon: '🌙' },
  { value: 'Mars', label: 'Mars', description: 'Trans-Mars Injection', icon: '🔴' },
  { value: 'Beyond', label: 'Beyond', description: 'Deep Space / Interplanetary', icon: '🌌' },
];

const PAYLOAD_OPTIONS: { value: PayloadType; label: string; icon: string }[] = [
  { value: 'communications', label: 'Communications', icon: '📡' },
  { value: 'earth_observation', label: 'Earth Observation', icon: '🛰️' },
  { value: 'technology_demo', label: 'Technology Demo', icon: '🧪' },
  { value: 'science', label: 'Science', icon: '🔬' },
  { value: 'navigation', label: 'Navigation', icon: '🧭' },
  { value: 'military', label: 'Military/Defense', icon: '🛡️' },
  { value: 'crewed', label: 'Crewed Mission', icon: '👨‍🚀' },
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMass(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toFixed(0)} kg`;
}

function getReliabilityColor(reliability: number): string {
  if (reliability >= 0.98) return 'text-green-400';
  if (reliability >= 0.95) return 'text-blue-400';
  if (reliability >= 0.90) return 'text-yellow-400';
  return 'text-red-400';
}

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    'USA': '🇺🇸',
    'USA/NZ': '🇺🇸🇳🇿',
    'France/EU': '🇪🇺',
    'Italy/EU': '🇪🇺',
    'India': '🇮🇳',
    'Japan': '🇯🇵',
    'China': '🇨🇳',
    'Russia': '🇷🇺',
  };
  return flags[country] || '🌍';
}

// ────────────────────────────────────────
// Provider Card Component
// ────────────────────────────────────────

function ProviderCard({
  provider,
  payloadMass,
  isRecommended,
}: {
  provider: ProviderCostEstimate;
  payloadMass: number;
  isRecommended: boolean;
}) {
  const isViable = provider.supportsOrbit && provider.supportsPayload;

  return (
    <div
      className={`card p-5 relative ${
        !isViable ? 'opacity-60' : ''
      } ${isRecommended ? 'ring-2 ring-nebula-500/50' : ''}`}
    >
      {isRecommended && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-nebula-500 text-slate-900 text-xs font-bold rounded-full">
          Best Value
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getCountryFlag(provider.country)}</span>
            <h3 className="font-semibold text-slate-900">{provider.providerName}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">{provider.vehicleName}</span>
            <span className={`font-mono text-xs ${getReliabilityColor(provider.reliability)}`}>
              {(provider.reliability * 100).toFixed(0)}% reliability
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold font-display ${isViable ? 'text-nebula-300' : 'text-slate-400'}`}>
            {formatCurrency(provider.typicalCost, true)}
          </div>
          <div className="text-slate-400 text-xs">typical cost</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <div>
          <span className="text-slate-400 text-xs block">Cost/kg</span>
          <span className="text-slate-900 font-mono">
            ${provider.costPerKg.min.toLocaleString()} - ${provider.costPerKg.max.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">Min Cost</span>
          <span className="text-slate-900 font-mono">{formatCurrency(provider.minCost, true)}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">Max Cost</span>
          <span className="text-slate-900 font-mono">{formatCurrency(provider.maxCost, true)}</span>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex flex-wrap gap-2 mb-3">
        {provider.supportsOrbit ? (
          <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">
            Orbit Supported
          </span>
        ) : (
          <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20">
            Orbit Not Supported
          </span>
        )}
        {provider.supportsPayload ? (
          <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">
            Payload OK ({formatMass(payloadMass)})
          </span>
        ) : (
          <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20">
            Payload Too Heavy
          </span>
        )}
      </div>

      {/* Notes */}
      {provider.notes.length > 0 && (
        <div className="text-xs text-slate-400 border-t border-slate-200 pt-3 space-y-1">
          {provider.notes.map((note, idx) => (
            <p key={idx}>{note}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Cost Summary Card
// ────────────────────────────────────────

function CostSummaryCard({ data }: { data: CostEstimateResponse }) {
  const { summary, input } = data;
  const viableProviders = data.providers.filter(p => p.supportsOrbit && p.supportsPayload);

  return (
    <div className="card-elevated p-6 border border-nebula-500/20">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">💰</span>
        <div>
          <h3 className="text-xl font-display font-bold text-slate-900">Mission Cost Summary</h3>
          <p className="text-slate-400 text-sm">
            {formatMass(input.payloadMass)} to {input.orbitType} | {PAYLOAD_OPTIONS.find(p => p.value === input.payloadType)?.label}
          </p>
        </div>
      </div>

      {/* Total cost highlight */}
      <div className="bg-gradient-to-r from-nebula-500/10 to-plasma-500/10 rounded-xl p-6 mb-6">
        <div className="text-center">
          <div className="text-slate-400 text-sm mb-2">Estimated Total Mission Cost</div>
          <div className="text-4xl font-display font-bold text-nebula-300 mb-2">
            {formatCurrency(summary.totalCost.typical, true)}
          </div>
          <div className="text-slate-400 text-sm">
            Range: {formatCurrency(summary.totalCost.min, true)} - {formatCurrency(summary.totalCost.max, true)}
          </div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-xl">🚀</span>
            <div>
              <span className="text-slate-900 font-medium">Launch Services</span>
              <p className="text-slate-400 text-xs">{viableProviders.length} viable providers</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-900 font-bold">{formatCurrency(summary.launchCost.typical, true)}</div>
            <div className="text-slate-400 text-xs">
              {formatCurrency(summary.launchCost.min, true)} - {formatCurrency(summary.launchCost.max, true)}
            </div>
          </div>
        </div>

        {summary.insurance && (
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xl">🛡️</span>
              <div>
                <span className="text-slate-900 font-medium">Insurance</span>
                <p className="text-slate-400 text-xs">Launch + In-orbit + Liability</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-900 font-bold">{formatCurrency(summary.insurance.totalInsurance.typical, true)}</div>
              <div className="text-slate-400 text-xs">
                {formatCurrency(summary.insurance.totalInsurance.min, true)} - {formatCurrency(summary.insurance.totalInsurance.max, true)}
              </div>
            </div>
          </div>
        )}

        {summary.regulatoryFees && (
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <span className="text-slate-900 font-medium">Regulatory Fees</span>
                <p className="text-slate-400 text-xs">FAA, FCC, NOAA, ITU</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-900 font-bold">{formatCurrency(summary.regulatoryFees.totalFees, true)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-slate-100/50 rounded-lg text-xs text-slate-500">
        <p className="font-medium text-slate-400 mb-1">Important Notes:</p>
        <ul className="space-y-1">
          <li>Estimates based on publicly available pricing and industry benchmarks</li>
          <li>Actual costs vary based on mission specifics, negotiations, and market conditions</li>
          <li>Does not include spacecraft development, ground segment, or operations costs</li>
          <li>Insurance based on payload value of {formatCurrency(input.payloadValue)}</li>
        </ul>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Insurance Details Component
// ────────────────────────────────────────

function InsuranceDetails({ insurance, payloadValue }: { insurance: InsuranceEstimate; payloadValue: number }) {
  const coverages = [
    {
      name: 'Launch Insurance',
      icon: '🚀',
      data: insurance.launchInsurance,
      description: 'Covers pre-launch through orbit insertion and commissioning',
      rateRange: '2% - 10%',
    },
    {
      name: 'In-Orbit Insurance',
      icon: '🛰️',
      data: insurance.inOrbitInsurance,
      description: 'Annual coverage for operational satellite',
      rateRange: '1% - 5%',
    },
    {
      name: 'Third-Party Liability',
      icon: '⚖️',
      data: insurance.thirdPartyLiability,
      description: 'Coverage for third-party damage claims',
      rateRange: '0.1% - 0.5%',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="card-elevated p-5 border border-nebula-500/20">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🛡️</span>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Insurance Cost Breakdown</h3>
            <p className="text-slate-400 text-sm">Based on payload value of {formatCurrency(payloadValue)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {coverages.map((coverage) => (
            <div key={coverage.name} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{coverage.icon}</span>
                <span className="text-slate-900 font-medium">{coverage.name}</span>
              </div>
              <div className="text-2xl font-bold text-nebula-300 mb-1">
                {formatCurrency(coverage.data.typical, true)}
              </div>
              <div className="text-slate-400 text-xs mb-2">
                {formatCurrency(coverage.data.min, true)} - {formatCurrency(coverage.data.max, true)}
              </div>
              <p className="text-slate-400 text-xs">{coverage.description}</p>
              <div className="mt-2 text-xs text-slate-400">Rate: {coverage.rateRange}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-slate-100/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-slate-900 font-medium">Total Insurance Premium</span>
            <div className="text-right">
              <div className="text-xl font-bold text-nebula-300">
                {formatCurrency(insurance.totalInsurance.typical, true)}
              </div>
              <div className="text-slate-400 text-xs">
                {formatCurrency(insurance.totalInsurance.min, true)} - {formatCurrency(insurance.totalInsurance.max, true)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h4 className="font-semibold text-slate-900 mb-3">Major Space Insurance Providers</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { name: "Lloyd's of London", share: '25%' },
            { name: 'Swiss Re', share: '15%' },
            { name: 'Munich Re', share: '14%' },
            { name: 'AXA XL', share: '12%' },
            { name: 'Allianz Space', share: '10%' },
            { name: 'Starr Insurance', share: '8%' },
            { name: 'Global Aerospace', share: '6%' },
            { name: 'Other', share: '10%' },
          ].map((provider) => (
            <div key={provider.name} className="p-3 bg-slate-100/30 rounded-lg">
              <div className="text-slate-900 font-medium truncate">{provider.name}</div>
              <div className="text-slate-400 text-xs">{provider.share} market share</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Regulatory Fees Component
// ────────────────────────────────────────

function RegulatoryDetails({ fees }: { fees: RegulatoryFeesEstimate }) {
  const feeItems = [
    { name: 'FAA Launch License', amount: fees.faaLicenseFee, agency: 'FAA/AST', icon: '🛫' },
    { name: 'FCC Spectrum Filing', amount: fees.fccFilingFee, agency: 'FCC', icon: '📡' },
    { name: 'NOAA Remote Sensing', amount: fees.noaaLicenseFee, agency: 'NOAA', icon: '🌍' },
    { name: 'ITU Coordination', amount: fees.ituFilingFee, agency: 'ITU', icon: '🌐' },
    { name: 'Miscellaneous Fees', amount: fees.miscFees, agency: 'Various', icon: '📋' },
  ].filter(f => f.amount > 0);

  return (
    <div className="space-y-4">
      <div className="card-elevated p-5 border border-nebula-500/20">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📋</span>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Regulatory Filing Fees</h3>
            <p className="text-slate-400 text-sm">US-based mission regulatory requirements</p>
          </div>
        </div>

        <div className="space-y-3">
          {feeItems.map((item) => (
            <div key={item.name} className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <span className="text-slate-900 font-medium">{item.name}</span>
                  <p className="text-slate-400 text-xs">{item.agency}</p>
                </div>
              </div>
              <div className="text-slate-900 font-bold font-mono">
                {formatCurrency(item.amount)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-gradient-to-r from-nebula-500/10 to-plasma-500/10 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-slate-900 font-semibold">Total Regulatory Fees</span>
            <div className="text-xl font-bold text-nebula-300">{formatCurrency(fees.totalFees)}</div>
          </div>
        </div>
      </div>

      {fees.notes.length > 0 && (
        <div className="card p-5">
          <h4 className="font-semibold text-slate-900 mb-3">Additional Requirements</h4>
          <ul className="space-y-2">
            {fees.notes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                <span className="text-nebula-300 mt-0.5">*</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5 border-dashed">
        <h4 className="font-semibold text-slate-900 mb-3">Typical Licensing Timeline</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="text-slate-400 font-medium mb-2">US Regulatory Path</h5>
            <ul className="space-y-1 text-slate-400">
              <li>FAA Launch License: 6-12 months</li>
              <li>FCC Authorization: 12-18 months</li>
              <li>NOAA License: 4-6 months</li>
              <li>ITU Coordination: 2-7 years</li>
            </ul>
          </div>
          <div>
            <h5 className="text-slate-400 font-medium mb-2">Key Milestones</h5>
            <ul className="space-y-1 text-slate-400">
              <li>Start licensing 18-24 months before launch</li>
              <li>ITU filings should begin 3-5 years ahead</li>
              <li>Environmental review concurrent with FAA</li>
              <li>Insurance proof required for FAA approval</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Content Component
// ────────────────────────────────────────

function MissionCostContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Form state
  const [payloadMass, setPayloadMass] = useState<number>(1000);
  const [orbitType, setOrbitType] = useState<OrbitType>('LEO');
  const [payloadType, setPayloadType] = useState<PayloadType>('communications');
  const [payloadValue, setPayloadValue] = useState<number>(100000000);
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [includeRegulatory, setIncludeRegulatory] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('calculator');

  // Data state
  const [data, setData] = useState<CostEstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from URL params
  useEffect(() => {
    const mass = searchParams.get('mass');
    const orbit = searchParams.get('orbit');
    const type = searchParams.get('type');
    const value = searchParams.get('value');
    const tab = searchParams.get('tab');

    if (mass) setPayloadMass(parseInt(mass));
    if (orbit && ORBIT_OPTIONS.some(o => o.value === orbit)) setOrbitType(orbit as OrbitType);
    if (type && PAYLOAD_OPTIONS.some(p => p.value === type)) setPayloadType(type as PayloadType);
    if (value) setPayloadValue(parseInt(value));
    if (tab && ['calculator', 'providers', 'insurance', 'regulatory'].includes(tab)) {
      setActiveTab(tab as TabType);
    }
  }, [searchParams]);

  // URL sync
  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      }
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // Fetch cost estimate
  const calculateCost = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        mass: payloadMass.toString(),
        orbit: orbitType,
        type: payloadType,
        value: payloadValue.toString(),
        insurance: includeInsurance.toString(),
        regulatory: includeRegulatory.toString(),
      });

      const res = await fetch(`/api/mission-cost?${params.toString()}`);
      const result = await res.json();

      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
        updateUrl({
          mass: payloadMass.toString(),
          orbit: orbitType,
          type: payloadType,
          value: payloadValue.toString(),
        });
      }
    } catch (err) {
      setError('Failed to calculate mission cost');
    } finally {
      setLoading(false);
    }
  }, [payloadMass, orbitType, payloadType, payloadValue, includeInsurance, includeRegulatory, updateUrl]);

  // Auto-calculate on mount if we have URL params
  useEffect(() => {
    if (searchParams.get('mass')) {
      calculateCost();
    }
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    updateUrl({ tab });
  };

  const viableProviders = data?.providers.filter(p => p.supportsOrbit && p.supportsPayload) || [];
  const bestValueProvider = viableProviders.length > 0
    ? viableProviders.reduce((best, p) => p.typicalCost < best.typicalCost ? p : best)
    : null;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Mission Cost Simulator"
          subtitle="Estimate launch costs, insurance premiums, and regulatory fees for your space mission"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Mission Cost' }]}
        />

        {/* Input Form */}
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <span>🎯</span> Mission Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Payload Mass */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Payload Mass (kg)
              </label>
              <input
                type="number"
                value={payloadMass}
                onChange={(e) => setPayloadMass(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-nebula-500"
                min={1}
                max={150000}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {[100, 500, 1000, 5000, 10000].map((mass) => (
                  <button
                    key={mass}
                    onClick={() => setPayloadMass(mass)}
                    className={`px-2 py-1 text-xs rounded ${
                      payloadMass === mass
                        ? 'bg-nebula-500 text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {formatMass(mass)}
                  </button>
                ))}
              </div>
            </div>

            {/* Orbit Type */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Target Orbit
              </label>
              <select
                value={orbitType}
                onChange={(e) => setOrbitType(e.target.value as OrbitType)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-nebula-500"
              >
                {ORBIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Payload Type */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Payload Type
              </label>
              <select
                value={payloadType}
                onChange={(e) => setPayloadType(e.target.value as PayloadType)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-nebula-500"
              >
                {PAYLOAD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Payload Value */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Payload Value (for insurance)
              </label>
              <input
                type="number"
                value={payloadValue}
                onChange={(e) => setPayloadValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-nebula-500"
                min={0}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {[10000000, 50000000, 100000000, 500000000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setPayloadValue(val)}
                    className={`px-2 py-1 text-xs rounded ${
                      payloadValue === val
                        ? 'bg-nebula-500 text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {formatCurrency(val, true)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInsurance}
                onChange={(e) => setIncludeInsurance(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-nebula-300 focus:ring-nebula-500"
              />
              <span className="text-sm text-slate-400">Include Insurance Estimate</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRegulatory}
                onChange={(e) => setIncludeRegulatory(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-nebula-300 focus:ring-nebula-500"
              />
              <span className="text-sm text-slate-400">Include Regulatory Fees</span>
            </label>

            <button
              onClick={calculateCost}
              disabled={loading}
              className="ml-auto btn-primary py-3 px-8 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Calculating...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Calculate Cost
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="card p-6 mb-8 bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {data && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {[
                { id: 'calculator' as const, label: 'Cost Summary', icon: '💰' },
                { id: 'providers' as const, label: 'Launch Providers', count: viableProviders.length },
                { id: 'insurance' as const, label: 'Insurance', icon: '🛡️' },
                { id: 'regulatory' as const, label: 'Regulatory Fees', icon: '📋' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-nebula-500 text-slate-900 shadow-glow-sm'
                      : 'bg-slate-800/60 text-slate-200 hover:bg-slate-700/70 hover:text-white border border-slate-600/30'
                  }`}
                >
                  {tab.icon && <span>{tab.icon}</span>}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id
                          ? 'bg-slate-200 text-slate-900'
                          : 'bg-slate-600/50 text-slate-200'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'calculator' && <CostSummaryCard data={data} />}

            {activeTab === 'providers' && (
              <div className="space-y-4">
                <div className="card p-4 flex items-center justify-between">
                  <div>
                    <span className="text-slate-900 font-medium">
                      {viableProviders.length} of {data.providers.length} providers can support this mission
                    </span>
                    <p className="text-slate-400 text-sm">
                      {formatMass(data.input.payloadMass)} to {data.input.orbitType}
                    </p>
                  </div>
                  {bestValueProvider && (
                    <div className="text-right">
                      <span className="text-slate-400 text-sm">Best value:</span>
                      <span className="ml-2 text-nebula-300 font-bold">
                        {bestValueProvider.providerName} {bestValueProvider.vehicleName}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {data.providers.map((provider) => (
                    <ProviderCard
                      key={provider.providerId}
                      provider={provider}
                      payloadMass={data.input.payloadMass}
                      isRecommended={bestValueProvider?.providerId === provider.providerId}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'insurance' && data.insurance && (
              <InsuranceDetails insurance={data.insurance} payloadValue={data.input.payloadValue} />
            )}

            {activeTab === 'regulatory' && data.regulatoryFees && (
              <RegulatoryDetails fees={data.regulatoryFees} />
            )}
          </>
        )}

        {/* Empty state */}
        {!data && !loading && (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">🚀</span>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Configure Your Mission
            </h2>
            <p className="text-slate-400 mb-6 max-w-lg mx-auto">
              Enter your payload mass, target orbit, and mission type above, then click
              &quot;Calculate Cost&quot; to get a comprehensive cost breakdown.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span>🚀</span> Launch provider comparison
              </div>
              <div className="flex items-center gap-2">
                <span>🛡️</span> Insurance estimates
              </div>
              <div className="flex items-center gap-2">
                <span>📋</span> Regulatory fees
              </div>
            </div>
          </div>
        )}

        {/* Related Links */}
        <div className="card p-5 mt-8 border border-nebula-500/20">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/space-insurance"
              className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group"
            >
              <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">
                🛡️ Space Insurance
              </div>
              <p className="text-xs text-slate-400 mt-1">Market data and policy information</p>
            </Link>
            <Link
              href="/resource-exchange"
              className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group"
            >
              <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">
                💰 Resource Exchange
              </div>
              <p className="text-xs text-slate-400 mt-1">Space commodities pricing</p>
            </Link>
            <Link
              href="/compliance"
              className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group"
            >
              <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">
                ⚖️ Compliance
              </div>
              <p className="text-xs text-slate-400 mt-1">Export controls and regulations</p>
            </Link>
            <Link
              href="/launch-windows"
              className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group"
            >
              <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">
                🪟 Launch Windows
              </div>
              <p className="text-xs text-slate-400 mt-1">Optimal launch timing</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page (with Suspense boundary)
// ────────────────────────────────────────

export default function MissionCostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <div className="container mx-auto px-4">
            <PageHeader
              title="Mission Cost Simulator"
              subtitle="Estimate launch costs, insurance premiums, and regulatory fees for your space mission"
              breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Mission Cost' }]}
            />
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </div>
      }
    >
      <MissionCostContent />
    </Suspense>
  );
}
