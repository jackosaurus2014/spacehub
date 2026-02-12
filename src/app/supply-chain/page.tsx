'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import PremiumGate from '@/components/PremiumGate';
import ExportButton from '@/components/ui/ExportButton';
import SupplyChainNode from '@/components/supply-chain/SupplyChainNode';
import ShortageAlert from '@/components/supply-chain/ShortageAlert';
import DependencyChart from '@/components/supply-chain/DependencyChart';
import {
  SupplyChainCompany,
  SupplyRelationship,
  SupplyShortage,
  SUPPLY_CHAIN_TIERS,
  SUPPLY_CHAIN_COUNTRIES,
  SUPPLY_CHAIN_PRODUCT_CATEGORIES,
  SHORTAGE_SEVERITY_INFO,
} from '@/types';

interface SupplyChainStats {
  totalCompanies: number;
  primeContractors: number;
  tier1Suppliers: number;
  tier2Suppliers: number;
  tier3Suppliers: number;
  totalRelationships: number;
  highRiskRelationships: number;
  criticalRelationships: number;
  totalShortages: number;
  criticalShortages: number;
  highSeverityShortages: number;
  countriesWithHighRisk: string[];
  usCompanies: number;
  europeanCompanies: number;
}

function SupplyChainContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL state
  const initialTab = searchParams.get('tab') || 'overview';
  const initialTier = searchParams.get('tier') || '';
  const initialCountry = searchParams.get('country') || '';
  const initialSeverity = searchParams.get('severity') || '';

  // Local state
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'shortages' | 'risks'>(
    initialTab as 'overview' | 'companies' | 'shortages' | 'risks'
  );
  const [stats, setStats] = useState<SupplyChainStats | null>(null);
  const [companies, setCompanies] = useState<SupplyChainCompany[]>([]);
  const [relationships, setRelationships] = useState<SupplyRelationship[]>([]);
  const [shortages, setShortages] = useState<SupplyShortage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Filters
  const [tierFilter, setTierFilter] = useState<string>(initialTier);
  const [countryFilter, setCountryFilter] = useState<string>(initialCountry);
  const [severityFilter, setSeverityFilter] = useState<string>(initialSeverity);
  const [showHighRiskOnly, setShowHighRiskOnly] = useState(false);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab && activeTab !== 'overview') params.set('tab', activeTab);
    if (tierFilter) params.set('tier', tierFilter);
    if (countryFilter) params.set('country', countryFilter);
    if (severityFilter) params.set('severity', severityFilter);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [activeTab, tierFilter, countryFilter, severityFilter, router, pathname]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
    fetchRelationships();
  }, []);

  // Fetch data based on active tab
  useEffect(() => {
    fetchTabData();
  }, [activeTab, tierFilter, countryFilter, severityFilter]);

  const fetchStats = async () => {
    setError(null);
    try {
      const res = await fetch('/api/supply-chain?type=stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setError('Failed to load data.');
    }
  };

  const fetchRelationships = async () => {
    setError(null);
    try {
      const res = await fetch('/api/supply-chain?type=relationships');
      const data = await res.json();
      setRelationships(data.relationships || []);
    } catch (error) {
      console.error('Failed to fetch relationships:', error);
      setError('Failed to load data.');
    }
  };

  const fetchTabData = async () => {
    setLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case 'overview':
        case 'companies': {
          const params = new URLSearchParams({ type: 'companies' });
          if (tierFilter) params.set('tier', tierFilter);
          if (countryFilter) params.set('country', countryFilter);
          const res = await fetch(`/api/supply-chain?${params}`);
          const data = await res.json();
          setCompanies(data.companies || []);
          break;
        }
        case 'shortages': {
          const params = new URLSearchParams({ type: 'shortages' });
          if (severityFilter) params.set('severity', severityFilter);
          const res = await fetch(`/api/supply-chain?${params}`);
          const data = await res.json();
          setShortages(data.shortages || []);
          break;
        }
        case 'risks': {
          const [companiesRes, shortagesRes] = await Promise.all([
            fetch('/api/supply-chain?type=companies'),
            fetch('/api/supply-chain?type=shortages&severity=critical'),
          ]);
          const companiesData = await companiesRes.json();
          const shortagesData = await shortagesRes.json();
          setCompanies(companiesData.companies || []);
          setShortages(shortagesData.shortages || []);
          break;
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique countries from companies
  const availableCountries = Array.from(new Set(companies.map((c) => c.countryCode)));

  return (
    <>
      {/* Stats Overview */}
      {stats && (
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StaggerItem>
            <div className="card-elevated p-5 text-center">
              <div className="text-3xl font-bold font-display tracking-tight text-white">{stats.totalCompanies}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Companies</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-5 text-center">
              <div className="text-3xl font-bold font-display tracking-tight text-blue-400">{stats.primeContractors}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Primes</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-5 text-center">
              <div className="text-3xl font-bold font-display tracking-tight text-cyan-400">
                {stats.tier1Suppliers + stats.tier2Suppliers}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Tier 1-2</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-5 text-center">
              <div className="text-3xl font-bold font-display tracking-tight text-red-400">{stats.highRiskRelationships}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">High Risk</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-5 text-center">
              <div className="text-3xl font-bold font-display tracking-tight text-orange-400">{stats.criticalShortages}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Critical Shortages</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-5 text-center">
              <div className="text-3xl font-bold font-display tracking-tight text-green-400">{stats.usCompanies}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">US Companies</div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* Risk Summary Banner */}
      {stats && stats.highRiskRelationships > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-white">Supply Chain Risk Alert</h3>
              <p className="text-sm text-slate-300">
                {stats.highRiskRelationships} high-risk supplier relationships and {stats.criticalShortages} critical material shortages detected.
                Key dependencies include China (rare earths), Taiwan (semiconductors), and Russia (titanium).
              </p>
            </div>
            <button
              onClick={() => setActiveTab('risks')}
              className="ml-auto text-sm text-red-400 hover:text-red-300 whitespace-nowrap"
            >
              View Details →
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'overview', label: 'Value Chain Map', icon: '🗺️' },
          { id: 'companies', label: 'Companies', icon: '🏢' },
          { id: 'shortages', label: 'Shortages', icon: '⚠️' },
          { id: 'risks', label: 'Risk Analysis', icon: '🔴' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/50'
                : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {(activeTab === 'overview' || activeTab === 'companies') && (
            <>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-space-700 border border-space-600 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-nebula-500 focus:outline-none"
              >
                <option value="">All Tiers</option>
                {SUPPLY_CHAIN_TIERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-space-700 border border-space-600 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-nebula-500 focus:outline-none"
              >
                <option value="">All Countries</option>
                {Object.entries(SUPPLY_CHAIN_COUNTRIES).map(([code, info]) => (
                  <option key={code} value={code}>{info.flag} {info.name}</option>
                ))}
              </select>
            </>
          )}
          {activeTab === 'shortages' && (
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-space-700 border border-space-600 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-nebula-500 focus:outline-none"
            >
              <option value="">All Severities</option>
              {Object.entries(SHORTAGE_SEVERITY_INFO).map(([key, info]) => (
                <option key={key} value={key}>{info.icon} {info.label}</option>
              ))}
            </select>
          )}
          {activeTab === 'overview' && (
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showHighRiskOnly}
                onChange={(e) => setShowHighRiskOnly(e.target.checked)}
                className="rounded bg-space-700 border-space-600 text-nebula-300 focus:ring-nebula-500"
              />
              Show high-risk only
            </label>
          )}
          <div className="ml-auto flex items-center gap-2">
            {activeTab === 'companies' && (
              <ExportButton
                data={companies}
                filename="supply-chain-companies"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'tier', label: 'Tier' },
                  { key: 'country', label: 'Country' },
                  { key: 'criticality', label: 'Criticality' },
                  { key: 'products', label: 'Products' },
                  { key: 'description', label: 'Description' },
                ]}
              />
            )}
            {activeTab === 'shortages' && (
              <ExportButton
                data={shortages}
                filename="supply-shortages"
                columns={[
                  { key: 'material', label: 'Material' },
                  { key: 'category', label: 'Category' },
                  { key: 'severity', label: 'Severity' },
                  { key: 'notes', label: 'Notes' },
                  { key: 'estimatedResolution', label: 'Est. Resolution' },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && !loading && (
        <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Overview / Value Chain Map */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <DependencyChart
                companies={companies}
                relationships={relationships}
                selectedCompanyId={selectedCompanyId}
                onSelectCompany={setSelectedCompanyId}
                showHighRiskOnly={showHighRiskOnly}
              />

              {/* Top critical shortages */}
              <div className="card p-4">
                <h3 className="font-semibold text-white mb-4">Active Critical Shortages</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shortages
                    .filter((s) => s.severity === 'critical' || s.severity === 'high')
                    .slice(0, 4)
                    .map((shortage) => (
                      <ShortageAlert key={shortage.id} shortage={shortage} />
                    ))}
                </div>
                <button
                  onClick={() => setActiveTab('shortages')}
                  className="mt-4 text-sm text-nebula-300 hover:text-nebula-200"
                >
                  View all shortages →
                </button>
              </div>
            </div>
          )}

          {/* Companies Tab */}
          {activeTab === 'companies' && (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {companies.map((company) => (
                <StaggerItem key={company.id}>
                  <SupplyChainNode
                    company={company}
                    relationships={relationships}
                    onSelectCompany={setSelectedCompanyId}
                    allCompanies={companies}
                  />
                </StaggerItem>
              ))}
              {companies.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <span className="text-5xl block mb-4">🏭</span>
                  <p className="text-slate-400">No companies found matching filters.</p>
                </div>
              )}
            </StaggerContainer>
          )}

          {/* Shortages Tab */}
          {activeTab === 'shortages' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {shortages.map((shortage) => (
                <ShortageAlert key={shortage.id} shortage={shortage} />
              ))}
              {shortages.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <span className="text-5xl block mb-4">✅</span>
                  <p className="text-slate-400">No shortages found matching filters.</p>
                </div>
              )}
            </div>
          )}

          {/* Risks Tab */}
          {activeTab === 'risks' && (
            <div className="space-y-6">
              {/* Geopolitical Risk Summary */}
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">Geopolitical Risk Assessment</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* China */}
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🇨🇳</span>
                      <h4 className="font-semibold text-red-400">China - High Risk</h4>
                    </div>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>- 90%+ rare earth processing</li>
                      <li>- 80% gallium production</li>
                      <li>- Export controls on critical materials</li>
                      <li>- Geopolitical tensions</li>
                    </ul>
                  </div>

                  {/* Taiwan */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🇹🇼</span>
                      <h4 className="font-semibold text-yellow-400">Taiwan - Medium Risk</h4>
                    </div>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>- 90%+ advanced semiconductors</li>
                      <li>- TSMC critical dependency</li>
                      <li>- Cross-strait tensions</li>
                      <li>- Single point of failure</li>
                    </ul>
                  </div>

                  {/* Russia */}
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🇷🇺</span>
                      <h4 className="font-semibold text-red-400">Russia - High Risk</h4>
                    </div>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>- 30% aerospace titanium</li>
                      <li>- Sanctions in effect</li>
                      <li>- Supply chain disruption</li>
                      <li>- Alternative sourcing needed</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* High-Risk Relationships */}
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">High-Risk Supply Relationships</h3>
                <div className="space-y-3">
                  {relationships
                    .filter((r) => r.geopoliticalRisk === 'high')
                    .map((rel) => (
                      <div
                        key={rel.id}
                        className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{rel.supplierName}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-medium text-white">{rel.customerName}</span>
                          </div>
                          <div className="text-sm text-slate-400 mt-1">
                            Products: {rel.products.join(', ').replace(/_/g, ' ')}
                          </div>
                          {rel.notes && (
                            <div className="text-sm text-red-400 mt-1">⚠️ {rel.notes}</div>
                          )}
                        </div>
                        {rel.annualValue && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-400">
                              ${(rel.annualValue / 1000000).toFixed(0)}M/yr
                            </div>
                            <div className="text-xs text-slate-400">Annual value</div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Critical Shortages */}
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">Critical Material Shortages</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shortages
                    .filter((s) => s.severity === 'critical')
                    .map((shortage) => (
                      <ShortageAlert key={shortage.id} shortage={shortage} isExpanded />
                    ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function SupplyChainPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Global Supply Chain"
          subtitle="Aerospace supply chain tracking with geopolitical risk analysis"
          icon="🔗"
          accentColor="cyan"
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            ← Back to Dashboard
          </Link>
        </AnimatedPageHeader>

        <PremiumGate requiredTier="pro">
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <SupplyChainContent />
          </Suspense>
        </PremiumGate>
      </div>
    </div>
  );
}
