'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
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
import {
  BOM_RISK_ITEMS,
  BOM_CATEGORY_INFO,
  RISK_LEVEL_INFO,
  ORBITAL_SYSTEM_NAMES,
  getBOMRiskStats,
  getAllBOMCategories,
  getAllUsedInSystems,
  type BOMRiskItem,
  type BOMRiskLevel,
  type BOMCategory,
} from '@/lib/supply-chain-bom-risks';

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
  type TabId = 'overview' | 'companies' | 'shortages' | 'risks' | 'bom-risks';
  const [activeTab, setActiveTab] = useState<TabId>(
    initialTab as TabId
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

  // BOM Risk tab state
  const [bomSearch, setBomSearch] = useState('');
  const [bomRiskFilter, setBomRiskFilter] = useState<Set<BOMRiskLevel>>(new Set());
  const [bomCategoryFilter, setBomCategoryFilter] = useState<string>('');
  const [bomSystemFilter, setBomSystemFilter] = useState<string>('');
  const [expandedBomItems, setExpandedBomItems] = useState<Set<string>>(new Set());

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
    // BOM risks tab uses client-side data — no fetch needed
    if (activeTab === 'bom-risks') {
      setLoading(false);
      return;
    }
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

  // BOM risk data (client-side, filtered)
  const bomRiskStats = useMemo(() => getBOMRiskStats(), []);
  const bomCategories = useMemo(() => getAllBOMCategories(), []);
  const bomSystems = useMemo(() => getAllUsedInSystems(), []);

  const filteredBomItems = useMemo(() => {
    let items = [...BOM_RISK_ITEMS];

    // Filter by risk level checkboxes
    if (bomRiskFilter.size > 0) {
      items = items.filter((item) => bomRiskFilter.has(item.riskLevel));
    }

    // Filter by category
    if (bomCategoryFilter) {
      items = items.filter((item) => item.category === bomCategoryFilter);
    }

    // Filter by orbital system
    if (bomSystemFilter) {
      items = items.filter((item) => item.usedIn.includes(bomSystemFilter));
    }

    // Filter by search
    if (bomSearch.trim()) {
      const q = bomSearch.toLowerCase();
      items = items.filter(
        (item) =>
          item.component.toLowerCase().includes(q) ||
          item.primarySuppliers.some((s) => s.toLowerCase().includes(q)) ||
          item.notes.toLowerCase().includes(q)
      );
    }

    return items;
  }, [bomRiskFilter, bomCategoryFilter, bomSystemFilter, bomSearch]);

  const toggleBomRiskFilter = (level: BOMRiskLevel) => {
    setBomRiskFilter((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const toggleBomExpanded = (id: string) => {
    setExpandedBomItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
          { id: 'bom-risks', label: 'BOM Risk Analysis', icon: '📋' },
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
          {activeTab === 'bom-risks' && (
            <>
              <input
                type="text"
                value={bomSearch}
                onChange={(e) => setBomSearch(e.target.value)}
                placeholder="Search components..."
                className="bg-space-700 border border-space-600 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-nebula-500 focus:outline-none w-48"
              />
              <select
                value={bomCategoryFilter}
                onChange={(e) => setBomCategoryFilter(e.target.value)}
                className="bg-space-700 border border-space-600 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-nebula-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                {bomCategories.map((cat) => (
                  <option key={cat} value={cat}>{BOM_CATEGORY_INFO[cat].label}</option>
                ))}
              </select>
              <select
                value={bomSystemFilter}
                onChange={(e) => setBomSystemFilter(e.target.value)}
                className="bg-space-700 border border-space-600 text-slate-300 rounded-lg px-3 py-2 text-sm focus:border-nebula-500 focus:outline-none"
              >
                <option value="">All Systems</option>
                {bomSystems.map((sys) => (
                  <option key={sys} value={sys}>{ORBITAL_SYSTEM_NAMES[sys] || sys}</option>
                ))}
              </select>
            </>
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
            {activeTab === 'bom-risks' && (
              <ExportButton
                data={filteredBomItems.map((item) => ({
                  component: item.component,
                  category: item.category,
                  riskLevel: item.riskLevel,
                  leadTime: item.leadTime,
                  suppliers: item.primarySuppliers.join('; '),
                  usedIn: item.usedIn.map((s) => ORBITAL_SYSTEM_NAMES[s] || s).join('; '),
                  riskFactors: item.riskFactors.join('; '),
                  notes: item.notes,
                }))}
                filename="bom-risk-analysis"
                columns={[
                  { key: 'component', label: 'Component' },
                  { key: 'category', label: 'Category' },
                  { key: 'riskLevel', label: 'Risk Level' },
                  { key: 'leadTime', label: 'Lead Time' },
                  { key: 'suppliers', label: 'Suppliers' },
                  { key: 'usedIn', label: 'Used In' },
                  { key: 'riskFactors', label: 'Risk Factors' },
                  { key: 'notes', label: 'Notes' },
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

          {/* BOM Risk Analysis Tab */}
          {activeTab === 'bom-risks' && (
            <div className="space-y-6">
              {/* Risk Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {([
                  { level: 'critical' as BOMRiskLevel, count: bomRiskStats.critical },
                  { level: 'high' as BOMRiskLevel, count: bomRiskStats.high },
                  { level: 'medium' as BOMRiskLevel, count: bomRiskStats.medium },
                  { level: 'low' as BOMRiskLevel, count: bomRiskStats.low },
                  { level: 'no-risk' as BOMRiskLevel, count: bomRiskStats.noRisk },
                ]).map(({ level, count }) => {
                  const info = RISK_LEVEL_INFO[level];
                  const isActive = bomRiskFilter.has(level);
                  return (
                    <button
                      key={level}
                      onClick={() => toggleBomRiskFilter(level)}
                      className={`card-elevated p-4 text-center transition-all cursor-pointer border ${
                        isActive
                          ? `${info.borderColor} ${info.bgColor}`
                          : 'border-space-700 hover:border-space-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className={`w-2.5 h-2.5 rounded-full ${info.dotColor}`} />
                        <span className={`text-xs uppercase tracking-widest font-medium ${info.color}`}>
                          {info.label}
                        </span>
                      </div>
                      <div className={`text-3xl font-bold font-display tracking-tight ${info.color}`}>
                        {count}
                      </div>
                      <div className="text-slate-500 text-xs mt-1">
                        {isActive ? 'Click to clear' : 'Click to filter'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Risk Table */}
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-space-700">
                        <th className="text-left p-4 text-slate-400 font-medium">Component</th>
                        <th className="text-left p-4 text-slate-400 font-medium">Category</th>
                        <th className="text-left p-4 text-slate-400 font-medium">Risk</th>
                        <th className="text-left p-4 text-slate-400 font-medium">Lead Time</th>
                        <th className="text-left p-4 text-slate-400 font-medium hidden xl:table-cell">Cost Impact</th>
                        <th className="text-left p-4 text-slate-400 font-medium hidden lg:table-cell">Primary Suppliers</th>
                        <th className="text-left p-4 text-slate-400 font-medium hidden md:table-cell">Used In</th>
                        <th className="text-center p-4 text-slate-400 font-medium w-10">Info</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBomItems.map((item) => {
                        const riskInfo = RISK_LEVEL_INFO[item.riskLevel];
                        const catInfo = BOM_CATEGORY_INFO[item.category];
                        const isExpanded = expandedBomItems.has(item.id);

                        return (
                          <tr key={item.id} className="border-b border-space-800 hover:bg-space-800/50">
                            <td className="p-4">
                              <div className="font-medium text-white">{item.component}</div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${catInfo.color}`}>
                                {catInfo.label}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${riskInfo.bgColor} ${riskInfo.color} border ${riskInfo.borderColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${riskInfo.dotColor}`} />
                                {riskInfo.label}
                              </span>
                            </td>
                            <td className="p-4 text-slate-300 whitespace-nowrap">{item.leadTime}</td>
                            <td className="p-4 hidden xl:table-cell">
                              {item.costImpactRange ? (
                                <span className={`text-xs font-medium whitespace-nowrap ${
                                  item.riskLevel === 'critical' ? 'text-red-400' :
                                  item.riskLevel === 'high' ? 'text-orange-400' :
                                  'text-slate-400'
                                }`}>
                                  {item.costImpactRange}
                                </span>
                              ) : (
                                <span className="text-slate-600 text-xs">--</span>
                              )}
                            </td>
                            <td className="p-4 text-slate-400 hidden lg:table-cell">
                              <div className="max-w-xs truncate" title={item.primarySuppliers.join(', ')}>
                                {item.primarySuppliers.slice(0, 2).join(', ')}
                                {item.primarySuppliers.length > 2 && (
                                  <span className="text-slate-500"> +{item.primarySuppliers.length - 2}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 hidden md:table-cell">
                              <div className="flex flex-wrap gap-1">
                                {item.usedIn.slice(0, 3).map((sys) => (
                                  <span
                                    key={sys}
                                    className="inline-block px-1.5 py-0.5 rounded bg-space-700 text-slate-400 text-xs"
                                    title={ORBITAL_SYSTEM_NAMES[sys] || sys}
                                  >
                                    {(ORBITAL_SYSTEM_NAMES[sys] || sys).split(' ').slice(0, 2).join(' ')}
                                  </span>
                                ))}
                                {item.usedIn.length > 3 && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-space-700 text-slate-500 text-xs">
                                    +{item.usedIn.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => toggleBomExpanded(item.id)}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredBomItems.length === 0 && (
                  <div className="text-center py-12">
                    <span className="text-5xl block mb-4">📋</span>
                    <p className="text-slate-400">No BOM items match your filters.</p>
                    <button
                      onClick={() => {
                        setBomSearch('');
                        setBomRiskFilter(new Set());
                        setBomCategoryFilter('');
                        setBomSystemFilter('');
                      }}
                      className="mt-2 text-sm text-nebula-300 hover:text-nebula-200"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}

                <div className="px-4 py-3 border-t border-space-700 text-sm text-slate-500">
                  Showing {filteredBomItems.length} of {BOM_RISK_ITEMS.length} components
                </div>
              </div>

              {/* Expanded Details (rendered outside table for proper layout) */}
              {filteredBomItems
                .filter((item) => expandedBomItems.has(item.id))
                .map((item) => {
                  const riskInfo = RISK_LEVEL_INFO[item.riskLevel];
                  return (
                    <div
                      key={`detail-${item.id}`}
                      className={`card p-5 border ${riskInfo.borderColor}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-white text-lg">{item.component}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${riskInfo.bgColor} ${riskInfo.color} border ${riskInfo.borderColor}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${riskInfo.dotColor}`} />
                              {riskInfo.label} Risk
                            </span>
                            {item.costImpactRange && (
                              <span className={`text-xs font-medium ${
                                item.riskLevel === 'critical' ? 'text-red-400' :
                                item.riskLevel === 'high' ? 'text-orange-400' :
                                'text-yellow-400'
                              }`}>
                                Cost Impact: {item.costImpactRange}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleBomExpanded(item.id)}
                          className="text-slate-400 hover:text-white text-sm"
                        >
                          Close
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Risk Factors */}
                        <div>
                          <h5 className="text-sm font-medium text-slate-300 mb-2">Risk Factors</h5>
                          <ul className="space-y-1">
                            {item.riskFactors.map((factor, idx) => (
                              <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${riskInfo.dotColor}`} />
                                {factor}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Suppliers & Alternatives */}
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-sm font-medium text-slate-300 mb-2">Primary Suppliers</h5>
                            <div className="flex flex-wrap gap-2">
                              {item.primarySuppliers.map((supplier) => (
                                <span
                                  key={supplier}
                                  className="px-2 py-1 rounded bg-space-700 text-slate-300 text-xs border border-space-600"
                                >
                                  {supplier}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h5 className="text-sm font-medium text-slate-300 mb-2">Alternatives</h5>
                            <ul className="space-y-1">
                              {item.alternatives.map((alt, idx) => (
                                <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-blue-500" />
                                  {alt}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="text-sm font-medium text-slate-300 mb-2">Used In</h5>
                            <div className="flex flex-wrap gap-2">
                              {item.usedIn.map((sys) => (
                                <span
                                  key={sys}
                                  className="px-2 py-1 rounded bg-nebula-500/10 text-nebula-300 text-xs border border-nebula-500/30"
                                >
                                  {ORBITAL_SYSTEM_NAMES[sys] || sys}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Affected Subsystems */}
                          {item.affectedSubsystems && item.affectedSubsystems.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-slate-300 mb-2">Affected Subsystems</h5>
                              <div className="flex flex-wrap gap-2">
                                {item.affectedSubsystems.map((sub) => (
                                  <span
                                    key={sub}
                                    className="px-2 py-1 rounded bg-orange-500/10 text-orange-300 text-xs border border-orange-500/30"
                                  >
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mitigation Strategies */}
                      {item.mitigationStrategies && item.mitigationStrategies.length > 0 && (
                        <div className="mt-5 pt-5 border-t border-space-700">
                          <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Mitigation Strategies
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {item.mitigationStrategies.map((strategy, idx) => (
                              <div key={idx} className="bg-space-800 rounded-lg p-3 border border-space-700">
                                <div className="font-medium text-white text-sm mb-2">{strategy.name}</div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    {strategy.costDelta}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    {strategy.timeline}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400">Effectiveness:</span>
                                  <div className="flex-1 h-1.5 bg-space-700 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        strategy.effectiveness === 'High' ? 'bg-green-500 w-full' :
                                        strategy.effectiveness === 'Medium' ? 'bg-yellow-500 w-2/3' :
                                        'bg-red-500 w-1/3'
                                      }`}
                                    />
                                  </div>
                                  <span className={`text-xs font-medium ${
                                    strategy.effectiveness === 'High' ? 'text-green-400' :
                                    strategy.effectiveness === 'Medium' ? 'text-yellow-400' :
                                    'text-red-400'
                                  }`}>
                                    {strategy.effectiveness}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Historical Incidents */}
                      {item.historicalIncidents && item.historicalIncidents.length > 0 && (
                        <div className="mt-5 pt-5 border-t border-space-700">
                          <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            Historical Incidents
                          </h5>
                          <div className="space-y-3">
                            {item.historicalIncidents.map((incident, idx) => (
                              <div key={idx} className="relative pl-6 border-l-2 border-yellow-500/30">
                                <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-yellow-500" />
                                <div className="text-xs text-yellow-400 font-medium mb-1">{incident.date}</div>
                                <div className="text-sm text-white font-medium mb-1">{incident.description}</div>
                                <div className="text-xs text-red-400 mb-1">
                                  <span className="font-medium">Impact:</span> {incident.impact}
                                </div>
                                <div className="text-xs text-green-400">
                                  <span className="font-medium">Resolution:</span> {incident.resolution}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Company Cross-Reference Links */}
                      {item.supplierCompanyIds && item.supplierCompanyIds.length > 0 && (
                        <div className="mt-5 pt-5 border-t border-space-700">
                          <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Related Companies
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {item.supplierCompanyIds.map((slug) => (
                              <Link
                                key={slug}
                                href={`/company-profiles/${slug}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 text-xs font-medium border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                {slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="mt-4 pt-4 border-t border-space-700">
                        <p className="text-sm text-slate-400 leading-relaxed">{item.notes}</p>
                        <div className="mt-2 text-xs text-slate-500">
                          Lead Time: <span className="text-slate-300">{item.leadTime}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Key Insights Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Critical Supply Chain Bottlenecks */}
                <div className="card p-5 border border-red-500/30">
                  <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Critical Bottlenecks
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">-</span>
                      <span><strong className="text-white">Rad-hard memory</strong> impacts all 11 orbital systems. 12-18 month lead times with no DDR4/5 equivalents.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">-</span>
                      <span><strong className="text-white">Zero-boil-off cryocoolers</strong> block propellant depot viability. 100x scale-up needed from current TRL 5-6.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">-</span>
                      <span><strong className="text-white">EVA suit components</strong> sole-sourced from Collins Aerospace. One-at-a-time production rate.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">-</span>
                      <span><strong className="text-white">Space-qualified GPUs</strong> do not exist. Orbital data centers rely on shielded commercial parts.</span>
                    </li>
                  </ul>
                </div>

                {/* Geopolitical Risk Factors */}
                <div className="card p-5 border border-yellow-500/30">
                  <h4 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Geopolitical Risks
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">-</span>
                      <span><strong className="text-white">ITAR restrictions</strong> limit IR focal plane array and GPU exports. Only 2 US-based sources for large-format IR detectors.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">-</span>
                      <span><strong className="text-white">China rare earth controls</strong> affect gallium supply (80% global share) critical for GaAs solar cells and phased arrays.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">-</span>
                      <span><strong className="text-white">Russia titanium sanctions</strong> disrupted 30% of aerospace-grade titanium. Western alternatives ramping.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">-</span>
                      <span><strong className="text-white">Swiss/Japan actuator supply</strong> Precision robotic gearboxes depend on Maxon (CH) and Harmonic Drive (JP).</span>
                    </li>
                  </ul>
                </div>

                {/* Emerging Alternatives */}
                <div className="card p-5 border border-green-500/30">
                  <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Emerging Alternatives
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">-</span>
                      <span><strong className="text-white">Krypton propellant</strong> replacing xenon for electric propulsion. SpaceX already transitioned Starlink fleet.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">-</span>
                      <span><strong className="text-white">NanoXplore NG-LARGE</strong> European FPGA alternative to Xilinx/Microchip duopoly. Reduces US foundry dependency.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">-</span>
                      <span><strong className="text-white">Green propellants</strong> (AF-M315E, LMP-103S) replacing toxic hydrazine. Bradford Space and Aerojet scaling production.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">-</span>
                      <span><strong className="text-white">Optical inter-satellite links</strong> Mynaric, Tesat, CACI racing to 1,000+ units/year capacity for constellation demand.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Impact Analysis Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Impact Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Cost at Risk */}
                  <div className="card p-5 border border-red-500/20">
                    <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Total Cost at Risk
                    </h4>
                    {(() => {
                      const criticalHighItems = BOM_RISK_ITEMS.filter(
                        (i) => (i.riskLevel === 'critical' || i.riskLevel === 'high') && i.costImpactRange
                      );
                      const itemsWithCost = criticalHighItems.length;
                      return (
                        <div>
                          <div className="text-3xl font-bold font-display tracking-tight text-red-400 mb-1">
                            {itemsWithCost} items
                          </div>
                          <div className="text-sm text-slate-400 mb-3">
                            with quantified cost impact across critical and high-risk components
                          </div>
                          <div className="space-y-1.5">
                            {criticalHighItems.slice(0, 5).map((item) => (
                              <div key={item.id} className="flex justify-between items-center text-xs">
                                <span className="text-slate-300 truncate max-w-[60%]">{item.component}</span>
                                <span className={`font-medium ${
                                  item.riskLevel === 'critical' ? 'text-red-400' : 'text-orange-400'
                                }`}>
                                  {item.costImpactRange}
                                </span>
                              </div>
                            ))}
                            {criticalHighItems.length > 5 && (
                              <div className="text-xs text-slate-500 pt-1">
                                +{criticalHighItems.length - 5} more items
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Most Vulnerable Systems */}
                  <div className="card p-5 border border-orange-500/20">
                    <h4 className="font-semibold text-orange-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Most Vulnerable Systems
                    </h4>
                    {(() => {
                      const systemRiskCounts: Record<string, { critical: number; high: number }> = {};
                      BOM_RISK_ITEMS.forEach((item) => {
                        if (item.riskLevel === 'critical' || item.riskLevel === 'high') {
                          item.usedIn.forEach((sys) => {
                            if (!systemRiskCounts[sys]) systemRiskCounts[sys] = { critical: 0, high: 0 };
                            if (item.riskLevel === 'critical') systemRiskCounts[sys].critical++;
                            else systemRiskCounts[sys].high++;
                          });
                        }
                      });
                      const sorted = Object.entries(systemRiskCounts)
                        .sort(([, a], [, b]) => (b.critical * 3 + b.high) - (a.critical * 3 + a.high))
                        .slice(0, 6);
                      return (
                        <div className="space-y-2">
                          {sorted.map(([sys, counts]) => (
                            <div key={sys} className="flex items-center justify-between">
                              <span className="text-sm text-slate-300 truncate max-w-[55%]">
                                {ORBITAL_SYSTEM_NAMES[sys] || sys}
                              </span>
                              <div className="flex items-center gap-2">
                                {counts.critical > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                    {counts.critical} critical
                                  </span>
                                )}
                                {counts.high > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                    {counts.high} high
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Supply Chain Concentration */}
                  <div className="card p-5 border border-yellow-500/20">
                    <h4 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Supply Chain Concentration
                    </h4>
                    {(() => {
                      const singleSource = BOM_RISK_ITEMS.filter(
                        (i) => i.primarySuppliers.length === 1 &&
                        (i.riskLevel === 'critical' || i.riskLevel === 'high')
                      );
                      const dualSource = BOM_RISK_ITEMS.filter(
                        (i) => i.primarySuppliers.length === 2 &&
                        (i.riskLevel === 'critical' || i.riskLevel === 'high')
                      );
                      const withMitigation = BOM_RISK_ITEMS.filter(
                        (i) => i.mitigationStrategies && i.mitigationStrategies.length > 0
                      );
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/20">
                            <span className="text-sm text-slate-300">Single-source (critical/high)</span>
                            <span className="text-lg font-bold text-red-400">{singleSource.length}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-orange-500/10 border border-orange-500/20">
                            <span className="text-sm text-slate-300">Dual-source (critical/high)</span>
                            <span className="text-lg font-bold text-orange-400">{dualSource.length}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
                            <span className="text-sm text-slate-300">Items with mitigation plans</span>
                            <span className="text-lg font-bold text-green-400">{withMitigation.length}</span>
                          </div>
                          <div className="text-xs text-slate-500 pt-1">
                            {singleSource.length > 0 && (
                              <span>
                                Sole-source items: {singleSource.map((i) => i.component.split(' ').slice(0, 3).join(' ')).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
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
