'use client';

import { useState, useEffect, useContext, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import DataFreshness from '@/components/ui/DataFreshness';
import { clientLogger } from '@/lib/client-logger';
import {
  type TopTabId,
  type MfgTabId,
  type ManufacturingCompany,
  type ISSExperimentCategory,
  type ProductCategory,
  type MarketProjection,
  type ManufacturingProcess,
  type SpaceEnvironmentAdvantage,
  type ImgTabId,
  type SensorType,
  type PricingTier,
  type ProviderStatus,
  type ImageryProvider,
  type UseCase,
  type MarketTrend,
  type MfgDataContextType,
  MfgDataContext,
  FALLBACK_COMPANIES,
  FALLBACK_ISS_EXPERIMENT_CATEGORIES,
  FALLBACK_PRODUCT_CATEGORIES,
  FALLBACK_MARKET_PROJECTIONS,
  FALLBACK_MANUFACTURING_PROCESSES,
  FALLBACK_SPACE_ENVIRONMENT_ADVANTAGES,
  FALLBACK_IMG_PROVIDERS,
  FALLBACK_IMG_USE_CASES,
  FALLBACK_IMG_MARKET_TRENDS,
  FALLBACK_IMG_HERO_STATS,
  STATUS_STYLES,
  DEFAULT_STATUS_STYLE,
  MFG_TABS,
  IMG_STATUS_STYLES,
  DEFAULT_IMG_STATUS_STYLE,
  SENSOR_COLORS,
  IMG_PRICING_INFO,
  IMG_TABS,
} from './data';



function useMfgData() {
  return useContext(MfgDataContext);
}

// ────────────────────────────────────────
// Fallback Data — Manufacturing (used when DynamicContent is empty)
// ────────────────────────────────────────


// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function getTRLColor(trl: number): string {
  if (trl >= 8) return 'text-green-400';
  if (trl >= 6) return 'text-yellow-400';
  if (trl >= 4) return 'text-orange-400';
  return 'text-red-400';
}

function getTRLLabel(trl: number): string {
  if (trl >= 9) return 'Flight Proven';
  if (trl >= 7) return 'Prototype Demonstrated';
  if (trl >= 5) return 'Validated in Space';
  if (trl >= 3) return 'Proof of Concept';
  return 'Basic Research';
}

function formatMarketValue(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}T`;
  if (value >= 1) return `$${value.toFixed(0)}B`;
  return `$${(value * 1000).toFixed(0)}M`;
}

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

function OverviewTab() {
  const { COMPANIES, ISS_EXPERIMENT_CATEGORIES, PRODUCT_CATEGORIES, MARKET_PROJECTIONS, MANUFACTURING_PROCESSES, SPACE_ENVIRONMENT_ADVANTAGES } = useMfgData();
  const totalExperiments = ISS_EXPERIMENT_CATEGORIES.reduce((sum, cat) => sum + cat.count, 0);
  const operationalCompanies = COMPANIES.filter(c => c.status === 'operational').length;

  const keyStats = [
    { label: 'Market Size (2030 est.)', value: '$7B+', icon: '📈', sub: '~$18B mid-range by 2030' },
    { label: 'Active Companies', value: `${COMPANIES.length}+`, icon: '🏢', sub: `${operationalCompanies} operational` },
    { label: 'ISS Experiments', value: `${totalExperiments.toLocaleString()}+`, icon: '🧪', sub: 'Across all categories' },
    { label: 'Mfg Processes', value: `${MANUFACTURING_PROCESSES.length}`, icon: '⚙️', sub: `${PRODUCT_CATEGORIES.length} product categories` },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <ScrollReveal><div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {keyStats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <div className="text-star-300 text-xs uppercase tracking-widest">{stat.label}</div>
                <div className="text-white font-bold text-xl">{stat.value}</div>
                <div className="text-star-400 text-xs">{stat.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div></ScrollReveal>

      {/* Landscape Overview */}
      <ScrollReveal><div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🌐</span>
          In-Space Manufacturing Landscape
        </h2>
        <div className="space-y-4 text-star-300 leading-relaxed">
          <p>
            <span className="text-white font-semibold">In-space manufacturing</span> represents one of the most
            transformative emerging sectors of the space economy. By leveraging the unique properties of the space
            environment -- <span className="text-nebula-400">microgravity</span>, <span className="text-nebula-400">ultra-vacuum</span>,
            and <span className="text-nebula-400">extreme temperature differentials</span> -- companies are producing
            materials and products impossible or impractical to manufacture on Earth.
          </p>
          <p>
            The sector has moved from pure research to early commercial operations. Varda Space Industries has
            completed two successful autonomous manufacturing and re-entry missions (W-1 and W-2), demonstrating
            pharmaceutical production in orbit. Redwire Corporation operates multiple manufacturing facilities on the
            ISS, producing ZBLAN fiber optics and bioprinted tissue constructs. These milestones mark the transition
            from technology demonstration to genuine commercial activity.
          </p>
          <p>
            Market projections vary widely but consensus estimates place the in-space manufacturing market at
            <span className="text-white font-semibold"> $10-30 billion by 2030</span>, growing to potentially
            <span className="text-white font-semibold"> $50-120 billion by 2035</span> as commercial space stations
            come online and launch costs continue to decrease. The ISS National Lab has hosted over{' '}
            <span className="text-white font-semibold">{totalExperiments.toLocaleString()} experiments</span> across
            materials science, pharmaceuticals, biotech, and technology demonstrations, building the knowledge base
            for commercial-scale production.
          </p>
        </div>
      </div></ScrollReveal>

      {/* Market Projection Chart */}
      <ScrollReveal><div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">📈</span>
          Market Growth Projections
        </h2>
        <p className="text-star-300 text-sm mb-6">
          In-space manufacturing market size estimates (billions USD). Range reflects varying assumptions about
          launch cost reduction, commercial station availability, and product market penetration.
        </p>
        <div className="space-y-3">
          {MARKET_PROJECTIONS.map((proj) => {
            const maxVal = 120;
            return (
              <div key={proj.year} className="flex items-center gap-4">
                <span className="text-star-300 text-sm font-mono w-12">{proj.year}</span>
                <div className="flex-1 relative h-8">
                  {/* High range */}
                  <div
                    className="absolute inset-y-0 left-0 bg-nebula-500/10 rounded"
                    style={{ width: `${(proj.high / maxVal) * 100}%` }}
                  />
                  {/* Mid range */}
                  <div
                    className="absolute inset-y-0 left-0 bg-nebula-500/25 rounded"
                    style={{ width: `${(proj.mid / maxVal) * 100}%` }}
                  />
                  {/* Low range */}
                  <div
                    className="absolute inset-y-0 left-0 bg-nebula-500/50 rounded"
                    style={{ width: `${(proj.low / maxVal) * 100}%` }}
                  />
                  <div className="absolute inset-y-0 flex items-center pl-2">
                    <span className="text-white text-xs font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {formatMarketValue(proj.low)} - {formatMarketValue(proj.high)}
                    </span>
                  </div>
                </div>
                <span className="text-nebula-400 text-sm font-semibold w-16 text-right">{formatMarketValue(proj.mid)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-6 mt-4 text-xs text-star-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-nebula-500/50" /> Conservative
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-nebula-500/25" /> Mid-range
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-nebula-500/10" /> Optimistic
          </span>
        </div>
      </div></ScrollReveal>

      {/* Key Product Categories Quick View */}
      <ScrollReveal><div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🔬</span>
          Key Product Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCT_CATEGORIES.slice(0, 6).map((product) => (
            <div key={product.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{product.icon}</span>
                <h3 className="text-white font-semibold text-sm">{product.name}</h3>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400 font-semibold text-sm">{product.marketPotential}</span>
                <span className={`text-xs font-medium ${getTRLColor(product.trl)}`}>TRL {product.trl}</span>
              </div>
              <p className="text-star-400 text-xs">{product.timeToMarket} timeline</p>
            </div>
          ))}
        </div>
      </div></ScrollReveal>

      {/* Key Enablers */}
      <ScrollReveal><div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🚀</span>
          Key Market Enablers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Declining Launch Costs',
              description: 'SpaceX Falcon 9 rideshare at ~$5,500/kg to LEO, with Starship promising $200-500/kg. Lower launch costs make manufacturing economics viable for more product categories.',
              metric: '$5,500/kg',
              metricLabel: 'Current LEO cost',
            },
            {
              title: 'Commercial Space Stations',
              description: 'Axiom Station, Orbital Reef (Blue Origin/Sierra Space), StarLab (Voyager/Nanoracks), and Vast Haven-1 will provide dedicated manufacturing volume post-ISS retirement.',
              metric: '4+',
              metricLabel: 'Stations planned',
            },
            {
              title: 'Returnable Capsule Technology',
              description: 'Varda W-Series, Space Forge ForgeStar, and Dragon cargo demonstrate the ability to return manufactured goods to Earth affordably and reliably.',
              metric: '3',
              metricLabel: 'Active capsule programs',
            },
            {
              title: 'Robotic Automation',
              description: 'GITAI, Canadarm3, and other robotic systems enable autonomous manufacturing without constant crew supervision, dramatically reducing operational costs.',
              metric: '24/7',
              metricLabel: 'Autonomous operation',
            },
          ].map((enabler) => (
            <div key={enabler.title} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-white font-semibold">{enabler.title}</h3>
                <div className="text-right">
                  <div className="text-nebula-400 font-bold text-lg">{enabler.metric}</div>
                  <div className="text-star-400 text-xs">{enabler.metricLabel}</div>
                </div>
              </div>
              <p className="text-star-300 text-sm leading-relaxed">{enabler.description}</p>
            </div>
          ))}
        </div>
      </div></ScrollReveal>

      {/* Space Environment Advantages */}
      <ScrollReveal><div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🌌</span>
          Why Manufacture in Space?
        </h2>
        <p className="text-star-300 text-sm mb-6 leading-relaxed">
          The space environment offers unique physical conditions that enable manufacturing processes impossible
          or impractical on Earth. These advantages drive the entire in-space manufacturing industry.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SPACE_ENVIRONMENT_ADVANTAGES.map((advantage) => (
            <div key={advantage.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30 hover:border-nebula-500/30 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{advantage.icon}</span>
                <h3 className="text-white font-semibold text-sm">{advantage.name}</h3>
              </div>
              <p className="text-star-300 text-xs mb-3 leading-relaxed">{advantage.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {advantage.enabledProducts.slice(0, 4).map((product) => (
                  <span key={product} className="px-1.5 py-0.5 bg-nebula-500/10 text-nebula-300 rounded text-xs">
                    {product}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div></ScrollReveal>

      {/* In-Space Manufacturing Market Snapshot */}
      <ScrollReveal><div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">💰</span>
          Market Snapshot
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-700/30 rounded-lg p-4 border border-green-500/20">
            <div className="text-green-400 font-bold text-2xl">~$7B</div>
            <div className="text-star-400 text-xs uppercase tracking-widest mt-1">By 2030 (Conservative)</div>
            <p className="text-star-300 text-xs mt-2">Focused on near-term products: ZBLAN fiber optics, pharmaceutical crystallization, and bioprinting research services.</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-4 border border-nebula-500/20">
            <div className="text-nebula-400 font-bold text-2xl">~$18B</div>
            <div className="text-star-400 text-xs uppercase tracking-widest mt-1">By 2030 (Mid-range)</div>
            <p className="text-star-300 text-xs mt-2">Includes commercial station manufacturing, semiconductor production, and early ISRU operations on the Moon.</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-4 border border-purple-500/20">
            <div className="text-purple-400 font-bold text-2xl">~$70B+</div>
            <div className="text-star-400 text-xs uppercase tracking-widest mt-1">By 2035 (Optimistic)</div>
            <p className="text-star-300 text-xs mt-2">Full-scale commercial manufacturing, bioprinted organs, space-based solar power construction, and lunar industrial base.</p>
          </div>
        </div>
        <div className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/30">
          <p className="text-star-400 text-xs leading-relaxed">
            <span className="text-white font-semibold">Key growth drivers:</span> Declining launch costs (SpaceX Starship targeting $200-500/kg to LEO),
            commercial space station deployment (4+ stations planned for late 2020s), returnable capsule technology for product recovery,
            and proven product-market fit for ZBLAN, pharmaceuticals, and bioprinting. The in-space manufacturing market is
            projected to grow at 25-35% CAGR through 2035.
          </p>
        </div>
      </div></ScrollReveal>
    </div>
  );
}

function CompaniesTab() {
  const { COMPANIES } = useMfgData();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'trl' | 'founded'>('trl');

  const statuses = Array.from(new Set(COMPANIES.map(c => c.status)));

  const filteredCompanies = COMPANIES
    .filter(c => !statusFilter || c.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'trl') return b.trl - a.trl;
      if (sortBy === 'founded') return a.founded - b.founded;
      return a.name.localeCompare(b.name);
    });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{(STATUS_STYLES[s] || DEFAULT_STATUS_STYLE).label}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'trl' | 'founded')}
          className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
        >
          <option value="trl">Sort by TRL</option>
          <option value="name">Sort by Name</option>
          <option value="founded">Sort by Founded</option>
        </select>
      </div>

      <p className="text-star-300 text-sm mb-6">
        Showing {filteredCompanies.length} of {COMPANIES.length} companies in the in-space manufacturing ecosystem.
      </p>

      {/* Company Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCompanies.map((company) => {
          const statusStyle = STATUS_STYLES[company.status] || DEFAULT_STATUS_STYLE;
          return (
            <div
              key={company.id}
              className="card p-5 hover:border-nebula-500/40"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-lg">{company.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-star-400 text-sm">{company.hq}</span>
                    {company.ticker && (
                      <span className="text-nebula-400 text-xs font-mono font-bold bg-nebula-500/10 px-1.5 py-0.5 rounded">
                        {company.ticker}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded ${statusStyle.bg} ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-star-300 text-sm mb-4 leading-relaxed line-clamp-3">{company.description}</p>

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
                  <div className="text-star-400 text-xs uppercase tracking-widest mb-1">TRL</div>
                  <div className={`font-bold text-lg ${getTRLColor(company.trl)}`}>{company.trl}</div>
                  <div className={`text-xs ${getTRLColor(company.trl)}`}>{getTRLLabel(company.trl)}</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
                  <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Founded</div>
                  <div className="text-white font-bold text-lg">{company.founded}</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
                  <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Funding</div>
                  <div className="text-green-400 font-bold text-sm">{company.funding}</div>
                </div>
              </div>

              {/* Technology Focus */}
              <div className="mb-3">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Technology Focus</div>
                <p className="text-star-300 text-sm">{company.technologyFocus}</p>
              </div>

              {/* Key Products */}
              <div className="mb-3">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1.5">Key Products</div>
                <div className="flex flex-wrap gap-1.5">
                  {(company.keyProducts || []).map((product) => (
                    <span
                      key={product}
                      className="px-2 py-0.5 bg-nebula-500/10 text-nebula-300 rounded text-xs font-medium"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>

              {/* Milestones */}
              <div className="mb-3">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1.5">Key Milestones</div>
                <ul className="space-y-1">
                  {(company.milestones || []).slice(0, 3).map((milestone, i) => (
                    <li key={i} className="text-star-300 text-xs flex items-start gap-1.5">
                      <span className="text-nebula-400 mt-0.5">&#9656;</span>
                      {milestone}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-nebula-300 hover:text-nebula-200 text-sm inline-flex items-center gap-1"
                >
                  Visit Website &rarr;
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProcessesTab() {
  const { MANUFACTURING_PROCESSES, SPACE_ENVIRONMENT_ADVANTAGES } = useMfgData();
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const categories = Array.from(new Set(MANUFACTURING_PROCESSES.map(p => p.category)));
  const categoryLabels: Record<string, string> = {
    'additive': 'Additive Manufacturing',
    'crystal-growth': 'Crystal Growth',
    'fiber-optics': 'Fiber Optics',
    'bioprinting': 'Bioprinting',
    'regolith': 'Regolith / ISRU',
    'assembly': 'Assembly & Construction',
  };
  const categoryColors: Record<string, string> = {
    'additive': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    'crystal-growth': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    'fiber-optics': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    'bioprinting': 'text-green-400 bg-green-500/10 border-green-500/30',
    'regolith': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'assembly': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  };

  const filteredProcesses = categoryFilter
    ? MANUFACTURING_PROCESSES.filter(p => p.category === categoryFilter)
    : MANUFACTURING_PROCESSES;

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">⚙️</span>
          Manufacturing Processes for Space
        </h2>
        <p className="text-star-300 leading-relaxed">
          In-space manufacturing encompasses a diverse range of processes, from additive manufacturing (3D printing) of
          metals, polymers, and ceramics to crystal growth, fiber optic production, bioprinting, and regolith processing
          for lunar/Mars construction. Each process leverages specific advantages of the space environment --
          <span className="text-nebula-400"> microgravity</span>, <span className="text-nebula-400">ultra-vacuum</span>,
          and <span className="text-nebula-400">extreme temperatures</span> -- to produce materials and products with
          properties unachievable on Earth.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 text-center">
          <div className="text-white font-bold text-2xl">{MANUFACTURING_PROCESSES.length}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest mt-1">Manufacturing Processes</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-white font-bold text-2xl">{categories.length}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest mt-1">Process Categories</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-green-400 font-bold text-2xl">
            {MANUFACTURING_PROCESSES.filter(p => p.trl >= 7).length}
          </div>
          <div className="text-star-400 text-xs uppercase tracking-widest mt-1">Flight Demonstrated</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-white font-bold text-2xl">{SPACE_ENVIRONMENT_ADVANTAGES.length}</div>
          <div className="text-star-400 text-xs uppercase tracking-widest mt-1">Environment Advantages</div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-star-400 text-sm">Filter by category:</span>
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            categoryFilter === ''
              ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/50'
              : 'bg-slate-800 text-star-400 border border-slate-700 hover:border-slate-600 hover:text-white'
          }`}
        >
          All ({MANUFACTURING_PROCESSES.length})
        </button>
        {categories.map((cat) => {
          const count = MANUFACTURING_PROCESSES.filter(p => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/50'
                  : 'bg-slate-800 text-star-400 border border-slate-700 hover:border-slate-600 hover:text-white'
              }`}
            >
              {categoryLabels[cat] || cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Process Cards */}
      <div className="space-y-4">
        {filteredProcesses.map((process) => {
          const isExpanded = selectedProcess === process.id;
          const catColor = categoryColors[process.category] || 'text-star-400 bg-slate-500/10 border-slate-500/30';
          return (
            <div
              key={process.id}
              className="card overflow-hidden hover:border-nebula-500/30"
            >
              <button
                onClick={() => setSelectedProcess(isExpanded ? null : process.id)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{process.icon}</span>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{process.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${catColor}`}>
                          {categoryLabels[process.category] || process.category}
                        </span>
                        <span className={`text-xs font-medium ${getTRLColor(process.trl)}`}>
                          TRL {process.trl} - {getTRLLabel(process.trl)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-star-400 transition-transform flex-shrink-0 ml-3 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <p className="text-star-300 text-sm mt-3 leading-relaxed line-clamp-2">{process.description}</p>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 space-y-4">
                  <div className="border-t border-slate-700/50 pt-4">
                    <p className="text-star-300 text-sm leading-relaxed">{process.description}</p>
                  </div>

                  {/* Microgravity Advantage */}
                  <div className="bg-gradient-to-r from-nebula-500/10 to-purple-500/10 rounded-lg p-4 border border-nebula-500/20">
                    <h4 className="text-nebula-300 font-semibold text-sm mb-2 flex items-center gap-2">
                      <span>🪶</span> Microgravity / Space Advantage
                    </h4>
                    <p className="text-star-300 text-sm leading-relaxed">{process.microgravityAdvantage}</p>
                  </div>

                  {/* TRL Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-star-400 text-xs uppercase tracking-widest">Technology Readiness</span>
                      <span className={`text-sm font-bold ${getTRLColor(process.trl)}`}>
                        TRL {process.trl} - {getTRLLabel(process.trl)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-3 flex">
                      {Array.from({ length: 9 }, (_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-3 ${i === 0 ? 'rounded-l-full' : ''} ${i === 8 ? 'rounded-r-full' : ''} ${
                            i < process.trl
                              ? process.trl >= 8
                                ? 'bg-green-500/60'
                                : process.trl >= 6
                                ? 'bg-yellow-500/60'
                                : process.trl >= 4
                                ? 'bg-orange-500/60'
                                : 'bg-red-500/60'
                              : 'bg-slate-700/30'
                          } ${i > 0 ? 'border-l border-slate-600/30' : ''}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Techniques & Materials */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                      <h4 className="text-white font-semibold text-sm mb-2">Manufacturing Techniques</h4>
                      <ul className="space-y-1.5">
                        {process.techniques.map((technique, i) => (
                          <li key={i} className="text-star-300 text-xs flex items-start gap-2">
                            <span className="text-nebula-400 mt-0.5">&#9656;</span>
                            {technique}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                      <h4 className="text-white font-semibold text-sm mb-2">Materials</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {process.materials.map((material) => (
                          <span
                            key={material}
                            className="px-2 py-0.5 bg-nebula-500/10 text-nebula-300 rounded text-xs"
                          >
                            {material}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Applications & Key Players */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                      <h4 className="text-white font-semibold text-sm mb-2">Applications</h4>
                      <ul className="space-y-1.5">
                        {process.applications.map((app, i) => (
                          <li key={i} className="text-star-300 text-xs flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">&#9656;</span>
                            {app}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                      <h4 className="text-white font-semibold text-sm mb-2">Key Players</h4>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {process.keyPlayers.map((player) => (
                          <span
                            key={player}
                            className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded text-xs font-medium"
                          >
                            {player}
                          </span>
                        ))}
                      </div>
                      <h4 className="text-white font-semibold text-sm mb-2 mt-3">Challenges</h4>
                      <ul className="space-y-1.5">
                        {process.challenges.map((challenge, i) => (
                          <li key={i} className="text-star-300 text-xs flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">&#9888;</span>
                            {challenge}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Process Comparison Matrix */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">📋</span>
          Process Comparison Matrix
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left px-4 py-3 text-star-300 text-sm font-medium">Process</th>
                <th className="text-center px-4 py-3 text-star-300 text-sm font-medium">Category</th>
                <th className="text-center px-4 py-3 text-star-300 text-sm font-medium">TRL</th>
                <th className="text-center px-4 py-3 text-star-300 text-sm font-medium">Techniques</th>
                <th className="text-left px-4 py-3 text-star-300 text-sm font-medium">Key Players</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {MANUFACTURING_PROCESSES.map((process) => {
                const catColor = categoryColors[process.category] || 'text-star-400 bg-slate-500/10 border-slate-500/30';
                return (
                  <tr key={process.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{process.icon}</span>
                        <span className="text-white font-medium text-sm">{process.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${catColor}`}>
                        {categoryLabels[process.category] || process.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${getTRLColor(process.trl)}`}>{process.trl}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-star-300 text-sm">{process.techniques.length}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-star-400 text-xs">{process.keyPlayers.slice(0, 3).join(', ')}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Space Environment Physics */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🔬</span>
          Space Environment Advantages -- The Physics
        </h2>
        <p className="text-star-300 text-sm mb-6 leading-relaxed">
          Understanding <em>why</em> space manufacturing produces superior results requires understanding the
          fundamental physics of the space environment. Each advantage enables specific manufacturing processes.
        </p>
        <div className="space-y-4">
          {SPACE_ENVIRONMENT_ADVANTAGES.map((advantage) => (
            <div key={advantage.id} className="bg-slate-700/30 rounded-lg p-5 border border-slate-600/30">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{advantage.icon}</span>
                <div>
                  <h3 className="text-white font-semibold text-lg">{advantage.name}</h3>
                  <p className="text-star-400 text-sm">{advantage.description}</p>
                </div>
              </div>
              <div className="card p-4 mb-3">
                <h4 className="text-nebula-300 text-xs uppercase tracking-widest mb-2">Physics Explanation</h4>
                <p className="text-star-300 text-sm leading-relaxed">{advantage.physicsExplanation}</p>
              </div>
              <div>
                <h4 className="text-star-400 text-xs uppercase tracking-widest mb-2">Enabled Products</h4>
                <div className="flex flex-wrap gap-1.5">
                  {advantage.enabledProducts.map((product) => (
                    <span key={product} className="px-2 py-0.5 bg-green-500/10 text-green-300 border border-green-500/20 rounded text-xs font-medium">
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ISSLabTab() {
  const { ISS_EXPERIMENT_CATEGORIES } = useMfgData();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const totalExperiments = ISS_EXPERIMENT_CATEGORIES.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="space-y-8">
      {/* ISS Lab Overview */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🛸</span>
          ISS National Laboratory
        </h2>
        <div className="space-y-3 text-star-300 leading-relaxed">
          <p>
            The <span className="text-white font-semibold">ISS National Laboratory</span>, managed by the Center
            for the Advancement of Science in Space (CASIS), has facilitated over{' '}
            <span className="text-nebula-400 font-semibold">{totalExperiments.toLocaleString()}+ experiments</span> since
            the station was designated as a U.S. National Laboratory in 2005. These span materials science,
            pharmaceutical development, biological research, technology demonstrations, and fundamental physics.
          </p>
          <p>
            The laboratory provides researchers from government, academia, and the private sector with access to the
            unique microgravity environment of low Earth orbit. As the ISS approaches retirement (currently planned
            for 2030), the focus has shifted to transitioning successful research programs to commercial platforms
            and scaling promising results to production-grade manufacturing.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-star-300 text-xs uppercase tracking-widest mb-1">Total Experiments</div>
          <div className="text-white font-bold text-2xl">{totalExperiments.toLocaleString()}+</div>
          <div className="text-star-400 text-xs">Since 2005</div>
        </div>
        <div className="card p-5">
          <div className="text-star-300 text-xs uppercase tracking-widest mb-1">Categories</div>
          <div className="text-white font-bold text-2xl">{ISS_EXPERIMENT_CATEGORIES.length}</div>
          <div className="text-star-400 text-xs">Research domains</div>
        </div>
        <div className="card p-5">
          <div className="text-star-300 text-xs uppercase tracking-widest mb-1">Operational Since</div>
          <div className="text-white font-bold text-2xl">2000</div>
          <div className="text-star-400 text-xs">First crew Nov 2000</div>
        </div>
        <div className="card p-5">
          <div className="text-star-300 text-xs uppercase tracking-widest mb-1">Planned Retirement</div>
          <div className="text-white font-bold text-2xl">2030</div>
          <div className="text-star-400 text-xs">Transition to commercial</div>
        </div>
      </div>

      {/* Experiment Categories */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Experiments by Category</h2>
        <div className="space-y-3">
          {ISS_EXPERIMENT_CATEGORIES.map((category) => {
            const isExpanded = expandedCategory === category.name;
            const percentage = ((category.count / totalExperiments) * 100).toFixed(1);
            return (
              <div
                key={category.name}
                className="card overflow-hidden"
              >
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.name)}
                  className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-700/20 transition-colors"
                >
                  <span className="text-2xl">{category.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold ${category.color}`}>{category.name}</h3>
                      <span className="text-white font-bold">{category.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div
                        className="bg-nebula-500/60 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-star-400 text-xs mt-1">{percentage}% of total - {category.description}</p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-star-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                      <h4 className="text-white font-semibold text-sm mb-3">Key Results & Publications</h4>
                      <ul className="space-y-2">
                        {(category.keyResults || []).map((result, i) => (
                          <li key={i} className="text-star-300 text-sm flex items-start gap-2">
                            <span className="text-nebula-400 mt-0.5">&#9656;</span>
                            {result}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Key ISS Manufacturing Facilities */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🔧</span>
          Active Manufacturing Facilities on ISS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              name: 'Additive Manufacturing Facility (AMF)',
              operator: 'Redwire (Made In Space)',
              capability: '3D printing of tools, parts, and structures in microgravity',
              parts: '200+',
              since: '2016',
            },
            {
              name: '3D BioFabrication Facility (BFF)',
              operator: 'Redwire / Uniformed Services University',
              capability: 'Bioprinting human tissue constructs (cardiac, meniscus, bone)',
              parts: '50+ tissue constructs',
              since: '2019',
            },
            {
              name: 'ZBLAN Fiber Optic Production',
              operator: 'Redwire / FOMS Inc.',
              capability: 'Drawing ultra-low-loss fluoride glass optical fibers',
              parts: 'Multiple fiber draws',
              since: '2017',
            },
            {
              name: 'Ceramic Manufacturing Module (CMM)',
              operator: 'Redwire',
              capability: 'Sintering ceramic components for turbines and electronics',
              parts: 'Multiple batches',
              since: '2023',
            },
            {
              name: 'Bishop Airlock',
              operator: 'Nanoracks (Voyager Space)',
              capability: 'Commercial airlock for payload deployment and external exposure',
              parts: '1,800+ payloads serviced',
              since: '2020',
            },
            {
              name: 'Protein Crystal Growth Facilities',
              operator: 'Multiple (NASA, ESA, JAXA)',
              capability: 'Growing large, high-quality protein crystals for drug development',
              parts: '100+ campaigns',
              since: '2001',
            },
          ].map((facility) => (
            <div key={facility.name} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
              <h3 className="text-white font-semibold text-sm mb-1">{facility.name}</h3>
              <p className="text-nebula-400 text-xs mb-2">{facility.operator}</p>
              <p className="text-star-300 text-xs mb-3">{facility.capability}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-400 font-medium">{facility.parts} produced</span>
                <span className="text-star-400">Since {facility.since}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductsTab() {
  const { PRODUCT_CATEGORIES } = useMfgData();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">📊</span>
          Product Categories & Market Analysis
        </h2>
        <p className="text-star-300 leading-relaxed">
          The in-space manufacturing market is segmented into distinct product categories, each with different
          technology readiness levels, market sizes, and timelines to commercialization. The most near-term
          opportunities are in pharmaceutical crystallization and specialty fiber optics, while bioprinting and
          semiconductor manufacturing represent larger but longer-term markets.
        </p>
      </div>

      {/* Product Cards */}
      <div className="space-y-4">
        {PRODUCT_CATEGORIES.map((product) => {
          const isExpanded = selectedProduct === product.id;
          return (
            <div
              key={product.id}
              className="card overflow-hidden hover:border-nebula-500/30"
            >
              <button
                onClick={() => setSelectedProduct(isExpanded ? null : product.id)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{product.icon}</span>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{product.name}</h3>
                      <p className="text-star-400 text-sm mt-1">{product.keyAdvantage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-green-400 font-bold">{product.marketPotential}</div>
                      <div className="text-star-400 text-xs">{product.timeToMarket}</div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-star-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-star-400 text-xs">TRL:</span>
                    <span className={`text-sm font-bold ${getTRLColor(product.trl)}`}>{product.trl}/9</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-star-400 text-xs">Market:</span>
                    <span className="text-green-400 text-sm font-medium">{product.marketPotential}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-star-400 text-xs">Timeline:</span>
                    <span className="text-nebula-400 text-sm font-medium">{product.timeToMarket}</span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 space-y-4">
                  <div className="border-t border-slate-700/50 pt-4">
                    <p className="text-star-300 text-sm leading-relaxed">{product.description}</p>
                  </div>

                  {/* TRL Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-star-400 text-xs uppercase tracking-widest">Technology Readiness</span>
                      <span className={`text-sm font-bold ${getTRLColor(product.trl)}`}>
                        TRL {product.trl} - {getTRLLabel(product.trl)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-3 flex">
                      {Array.from({ length: 9 }, (_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-3 ${i === 0 ? 'rounded-l-full' : ''} ${i === 8 ? 'rounded-r-full' : ''} ${
                            i < product.trl
                              ? product.trl >= 8
                                ? 'bg-green-500/60'
                                : product.trl >= 6
                                ? 'bg-yellow-500/60'
                                : product.trl >= 4
                                ? 'bg-orange-500/60'
                                : 'bg-red-500/60'
                              : 'bg-slate-700/30'
                          } ${i > 0 ? 'border-l border-slate-600/30' : ''}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Competitive Landscape */}
                  <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                    <h4 className="text-white font-semibold text-sm mb-2">Competitive Landscape</h4>
                    <p className="text-star-300 text-sm mb-3">{product.competitiveLandscape}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(product.leaders || []).map((leader) => (
                        <span
                          key={leader}
                          className="px-2 py-0.5 bg-nebula-500/10 text-nebula-300 rounded text-xs font-medium"
                        >
                          {leader}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Market Comparison Table */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">📋</span>
          Product Comparison Matrix
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left px-4 py-3 text-star-300 text-sm font-medium">Product</th>
                <th className="text-center px-4 py-3 text-star-300 text-sm font-medium">TRL</th>
                <th className="text-right px-4 py-3 text-star-300 text-sm font-medium">Market Potential</th>
                <th className="text-center px-4 py-3 text-star-300 text-sm font-medium">Timeline</th>
                <th className="text-left px-4 py-3 text-star-300 text-sm font-medium">Leaders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {PRODUCT_CATEGORIES.map((product) => (
                <tr key={product.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{product.icon}</span>
                      <span className="text-white font-medium text-sm">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${getTRLColor(product.trl)}`}>{product.trl}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-green-400 font-semibold text-sm">{product.marketPotential}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-star-300 text-sm">{product.timeToMarket}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-star-400 text-xs">{(product.leaders || []).slice(0, 2).join(', ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Imagery Sub-Components
// ────────────────────────────────────────

function ImgProviderCard({ provider }: { provider: ImageryProvider }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = IMG_STATUS_STYLES[provider.status] || DEFAULT_IMG_STATUS_STYLE;
  return (
    <div className="card p-6 hover:border-cyan-500/30 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg group-hover:text-cyan-300 transition-colors">{provider.name}</h3>
          <p className="text-star-400 text-sm mt-0.5">{provider.headquarters}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${SENSOR_COLORS[provider.sensorType] || 'text-star-400 bg-slate-500/10 border-slate-500/30'}`}>{provider.sensorType}</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>{provider.status}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-700/30 rounded-lg p-2.5"><div className="text-star-400 text-xs uppercase tracking-widest mb-0.5">Resolution</div><div className="text-white text-sm font-semibold">{provider.resolutionM || '?'}m</div></div>
        <div className="bg-slate-700/30 rounded-lg p-2.5"><div className="text-star-400 text-xs uppercase tracking-widest mb-0.5">Revisit</div><div className="text-white text-sm font-semibold">{provider.revisitHours || '?'}h</div></div>
        <div className="bg-slate-700/30 rounded-lg p-2.5"><div className="text-star-400 text-xs uppercase tracking-widest mb-0.5">Satellites</div><div className="text-white text-sm font-semibold">{(provider.constellationSize || '').split(' ')[0] || '?'}</div></div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="px-2 py-0.5 bg-slate-700/50 text-star-300 border border-slate-600/30 rounded text-xs">{provider.spectralBands}</span>
        <span className="px-2 py-0.5 bg-slate-700/50 text-star-300 border border-slate-600/30 rounded text-xs">Swath: {provider.swathWidthKm}km</span>
        <span className="px-2 py-0.5 bg-slate-700/50 text-amber-300 border border-slate-600/30 rounded text-xs font-semibold">{provider.pricingTier}</span>
        {provider.archiveAvailable && <span className="px-2 py-0.5 bg-green-900/20 text-green-400 border border-green-500/20 rounded text-xs">Archive</span>}
        {provider.taskingAvailable && <span className="px-2 py-0.5 bg-cyan-900/20 text-cyan-400 border border-cyan-500/20 rounded text-xs">Tasking</span>}
      </div>
      <p className="text-star-300 text-sm leading-relaxed mb-4">{expanded ? (provider.description || '') : (provider.description || '').slice(0, 180) + '...'}</p>
      {expanded && (
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/30 rounded-lg p-3"><div className="text-star-400 text-xs uppercase tracking-widest mb-1">Orbit</div><div className="text-white text-sm">{provider.orbit}</div></div>
            <div className="bg-slate-700/30 rounded-lg p-3"><div className="text-star-400 text-xs uppercase tracking-widest mb-1">Since</div><div className="text-white text-sm">{provider.launchYear}</div></div>
            <div className="bg-slate-700/30 rounded-lg p-3"><div className="text-star-400 text-xs uppercase tracking-widest mb-1">Constellation</div><div className="text-white text-sm">{provider.constellationSize}</div></div>
            <div className="bg-slate-700/30 rounded-lg p-3"><div className="text-star-400 text-xs uppercase tracking-widest mb-1">Coverage</div><div className="text-white text-sm">{provider.coveragePercent}% global</div></div>
          </div>
          <div>
            <div className="text-star-400 text-xs uppercase tracking-widest mb-2">Key Highlights</div>
            <ul className="space-y-1">{(provider.highlights || []).map((h, i) => (<li key={i} className="text-star-300 text-sm flex items-start gap-2"><span className="text-cyan-400 mt-0.5 flex-shrink-0">-</span>{h}</li>))}</ul>
          </div>
        </div>
      )}
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
        {expanded ? 'Show less' : 'Show details'} {expanded ? '\u2191' : '\u2193'}
      </button>
    </div>
  );
}

function ImgComparisonTable({ sensorFilter }: { sensorFilter: string }) {
  const { IMG_PROVIDERS } = useMfgData();
  const filtered = sensorFilter ? IMG_PROVIDERS.filter((p) => p.sensorType === sensorFilter) : IMG_PROVIDERS;
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-slate-700/50"><h3 className="text-white font-semibold">Provider Comparison</h3><p className="text-star-400 text-sm mt-1">Side-by-side comparison of {filtered.length} satellite imagery providers</p></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700/50">
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Provider</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Type</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Resolution</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Revisit</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Bands</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Coverage</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Pricing</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Archive</th>
            <th className="text-left py-3 px-4 text-star-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Tasking</th>
          </tr></thead>
          <tbody>{filtered.map((p, idx) => (
            <tr key={p.id} className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${idx % 2 === 0 ? 'bg-slate-800/30' : ''}`}>
              <td className="py-3 px-4 text-white font-medium whitespace-nowrap">{p.name}</td>
              <td className="py-3 px-4 whitespace-nowrap"><span className={`text-xs font-medium px-2 py-0.5 rounded border ${SENSOR_COLORS[p.sensorType] || 'text-star-400 bg-slate-500/10 border-slate-500/30'}`}>{p.sensorType}</span></td>
              <td className="py-3 px-4 text-cyan-400 font-mono whitespace-nowrap">{p.resolutionM}m</td>
              <td className="py-3 px-4 text-star-300 whitespace-nowrap">{p.revisitHours}h</td>
              <td className="py-3 px-4 text-star-400 max-w-[200px] truncate">{p.spectralBands}</td>
              <td className="py-3 px-4 text-star-300 whitespace-nowrap">{p.coveragePercent}%</td>
              <td className="py-3 px-4 text-amber-400 font-semibold whitespace-nowrap">{p.pricingTier}</td>
              <td className="py-3 px-4 whitespace-nowrap">{p.archiveAvailable ? <span className="text-green-400 text-xs font-medium">Yes</span> : <span className="text-star-400 text-xs">No</span>}</td>
              <td className="py-3 px-4 whitespace-nowrap">{p.taskingAvailable ? <span className="text-green-400 text-xs font-medium">Yes</span> : <span className="text-star-400 text-xs">No</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="p-4 border-t border-slate-700/50">
        <h4 className="text-white font-semibold text-sm mb-3">Pricing Reference (Typical Ranges)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(IMG_PRICING_INFO).map(([tier, info]) => (
            <div key={tier} className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-amber-400 font-bold text-lg mb-2">{tier}</div>
              <div className="space-y-1 mb-2"><div className="text-star-300 text-xs"><span className="text-star-400">Archive:</span> {info.archive}</div><div className="text-star-300 text-xs"><span className="text-star-400">Tasking:</span> {info.tasking}</div></div>
              <p className="text-star-400 text-xs leading-relaxed">{info.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImgUseCaseCard({ useCase }: { useCase: UseCase }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card p-6 hover:border-cyan-500/30">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0">{useCase.icon}</span>
        <div><h3 className="text-white font-semibold text-lg">{useCase.name}</h3><p className="text-star-400 text-sm mt-1 leading-relaxed">{useCase.description}</p></div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">{(useCase.keyMetrics || []).map((metric) => (<span key={metric} className="px-2 py-0.5 bg-cyan-900/20 text-cyan-300 border border-cyan-500/20 rounded text-xs font-medium">{metric}</span>))}</div>
      <div className="mb-4">
        <div className="text-star-400 text-xs uppercase tracking-widest mb-2">Recommended Providers</div>
        <div className="flex flex-wrap gap-1.5">{(useCase.topProviders || []).map((provider, idx) => (<span key={provider} className={`px-2.5 py-1 rounded text-xs font-medium ${idx === 0 ? 'bg-amber-900/20 text-amber-300 border border-amber-500/20' : 'bg-slate-700/50 text-star-300 border border-slate-600/30'}`}>{idx === 0 ? `\u2B50 ${provider}` : provider}</span>))}</div>
      </div>
      {expanded && (<div className="mb-4"><div className="text-star-400 text-xs uppercase tracking-widest mb-2">Key Requirements</div><ul className="space-y-1">{(useCase.requirements || []).map((req, i) => (<li key={i} className="text-star-300 text-sm flex items-start gap-2"><span className="text-cyan-400 mt-0.5 flex-shrink-0">-</span>{req}</li>))}</ul></div>)}
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">{expanded ? 'Show less' : 'View requirements'} {expanded ? '\u2191' : '\u2193'}</button>
    </div>
  );
}

function ImageryMarketplaceContent() {
  const { IMG_PROVIDERS, IMG_USE_CASES, IMG_MARKET_TRENDS, IMG_HERO_STATS } = useMfgData();
  const [imgTab, setImgTab] = useState<ImgTabId>('providers');
  const [sensorFilter, setSensorFilter] = useState<string>('');
  const sensorTypes: SensorType[] = Array.from(new Set(IMG_PROVIDERS.map((p) => p.sensorType))) as SensorType[];
  const filteredProviders = sensorFilter ? IMG_PROVIDERS.filter((p) => p.sensorType === sensorFilter) : IMG_PROVIDERS;

  return (
    <div>
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {IMG_HERO_STATS.map((stat) => (
          <div key={stat.label} className="card p-5 text-center">
            <div className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.value}</div>
            <div className="text-star-400 text-xs uppercase tracking-widest font-medium mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Market Overview Banner */}
      <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-5 mb-8">
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0">{'\uD83C\uDF0D'}</span>
          <div>
            <h3 className="font-semibold text-white mb-1">Earth Observation Market</h3>
            <p className="text-sm text-star-300 leading-relaxed">
              The commercial Earth observation market is projected to exceed $8 billion by 2028, growing at
              approximately 12% CAGR. Over 1,000 commercial EO satellites are now in orbit, with SAR, hyperspectral,
              and thermal sensors emerging alongside traditional optical imaging. AI-powered analytics platforms
              are transforming raw imagery into automated intelligence products.
            </p>
          </div>
        </div>
      </div>

      {/* Imagery Sub-Tab Navigation */}
      <div className="border-b border-slate-700/50 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {IMG_TABS.map((tab) => (
            <button key={tab.id} onClick={() => setImgTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${imgTab === tab.id ? 'border-cyan-500 text-cyan-300' : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'}`}>
              <span className="mr-1.5">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Providers Sub-Tab */}
      {imgTab === 'providers' && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-star-400 text-sm">Filter by sensor:</span>
            <button onClick={() => setSensorFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sensorFilter === '' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-star-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}>All ({IMG_PROVIDERS.length})</button>
            {sensorTypes.map((type) => {
              const count = IMG_PROVIDERS.filter((p) => p.sensorType === type).length;
              return (<button key={type} onClick={() => setSensorFilter(type)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sensorFilter === type ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-star-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}>{type} ({count})</button>);
            })}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredProviders.map((provider) => (<ImgProviderCard key={provider.id} provider={provider} />))}
          </div>
          {filteredProviders.length === 0 && (<div className="text-center py-12"><span className="text-5xl block mb-4">{'\uD83D\uDEF0\uFE0F'}</span><p className="text-star-400">No providers match the selected filter.</p></div>)}
          <div className="mt-8 card p-6">
            <h3 className="font-semibold text-white mb-4">Providers by Sensor Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {sensorTypes.map((type) => {
                const count = IMG_PROVIDERS.filter((p) => p.sensorType === type).length;
                const colorClass = SENSOR_COLORS[type]?.split(' ')[0] || 'text-star-400';
                return (<div key={type} className="bg-slate-700/30 rounded-xl p-4 text-center"><div className={`text-2xl font-bold mb-1 ${colorClass}`}>{count}</div><div className="text-star-400 text-sm">{type}</div></div>);
              })}
            </div>
          </div>
        </div>
      )}

      {/* Compare Sub-Tab */}
      {imgTab === 'compare' && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-star-400 text-sm">Filter by sensor:</span>
            <button onClick={() => setSensorFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sensorFilter === '' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-star-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}>All</button>
            {sensorTypes.map((type) => (<button key={type} onClick={() => setSensorFilter(type)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sensorFilter === type ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-star-400 border border-slate-700 hover:border-slate-600 hover:text-white'}`}>{type}</button>))}
          </div>
          <ImgComparisonTable sensorFilter={sensorFilter} />
          <div className="mt-6 card p-6">
            <h3 className="text-white font-semibold mb-4">Key Selection Insights</h3>
            <div className="space-y-3">
              {[
                { num: '01', text: <><strong className="text-white">Resolution vs. coverage tradeoff.</strong> Maxar and Airbus offer 30cm resolution but limited daily capacity. Planet delivers daily global coverage at 3m. Choose based on whether you need detail or temporal frequency.</> },
                { num: '02', text: <><strong className="text-white">SAR is essential for all-weather operations.</strong> If your use case requires cloud-penetrating or nighttime imaging, SAR providers (ICEYE, Capella, Umbra) are necessary.</> },
                { num: '03', text: <><strong className="text-white">Archive vs. tasking pricing differs significantly.</strong> Archive imagery is typically 30-60% cheaper than new tasking collections. Always check archive availability before commissioning new collects.</> },
                { num: '04', text: <><strong className="text-white">Hyperspectral is the emerging differentiator.</strong> Pixxel, Wyvern, and Planet Tanager enable material identification and gas detection that traditional multispectral imagery cannot achieve.</> },
              ].map((item) => (<div key={item.num} className="flex items-start gap-3"><span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">{item.num}</span><p className="text-star-300 text-sm">{item.text}</p></div>))}
            </div>
          </div>
        </div>
      )}

      {/* Use Cases Sub-Tab */}
      {imgTab === 'usecases' && (
        <div>
          <div className="card p-5 mb-6">
            <h3 className="text-white font-semibold mb-2">Choosing the Right Provider for Your Use Case</h3>
            <p className="text-star-400 text-sm leading-relaxed">Different applications require different combinations of spatial resolution, spectral bands, revisit frequency, and sensor type. Below are provider recommendations organized by primary use case.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{IMG_USE_CASES.map((useCase) => (<ImgUseCaseCard key={useCase.id} useCase={useCase} />))}</div>
          <div className="mt-8 card p-6">
            <h3 className="font-semibold text-white mb-4">Most Versatile Providers</h3>
            <p className="text-star-400 text-sm mb-4">Providers ranked by number of use cases where they appear as a top recommendation:</p>
            <div className="space-y-3">
              {(() => {
                const providerCounts: Record<string, number> = {};
                IMG_USE_CASES.forEach((uc) => { (uc.topProviders || []).forEach((p) => { providerCounts[p] = (providerCounts[p] || 0) + 1; }); });
                const sorted = Object.entries(providerCounts).sort(([, a], [, b]) => b - a).slice(0, 8);
                const maxCount = sorted[0]?.[1] || 1;
                return sorted.map(([name, count]) => (<div key={name} className="flex items-center gap-4"><div className="w-40 flex-shrink-0 text-sm text-white font-medium truncate">{name}</div><div className="flex-1 h-6 bg-slate-700/30 rounded overflow-hidden relative"><div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded transition-all" style={{ width: `${Math.max((count / maxCount) * 100, 3)}%` }} /><span className="absolute inset-0 flex items-center px-2 text-xs text-white font-mono">{count} use cases</span></div></div>));
              })()}
            </div>
          </div>
          <div className="mt-6 card p-6">
            <h3 className="text-cyan-400 font-semibold mb-4">Multi-Sensor Fusion Strategy</h3>
            <p className="text-star-400 text-sm leading-relaxed mb-4">Most operational intelligence workflows benefit from combining multiple sensor types:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { combo: 'Optical + SAR', providers: 'Maxar + ICEYE', reason: 'All-weather, high-resolution monitoring. Optical for detail, SAR for cloud penetration and nighttime coverage.' },
                { combo: 'Daily Optical + Hyperspectral', providers: 'Planet + Pixxel', reason: 'Daily change detection combined with material-level identification. Ideal for agriculture and environmental monitoring.' },
                { combo: 'SAR + Thermal', providers: 'Capella + SatVu', reason: 'Infrastructure monitoring combining structural displacement detection with thermal anomaly identification.' },
                { combo: 'VHR Optical + Daily MS', providers: 'Airbus + Planet', reason: 'Detailed feature extraction from 30cm imagery combined with daily temporal monitoring at 3m.' },
              ].map((s) => (<div key={s.combo} className="bg-slate-700/30 rounded-lg p-4"><div className="text-white font-semibold text-sm mb-1">{s.combo}</div><div className="text-cyan-400 text-xs font-medium mb-2">{s.providers}</div><p className="text-star-400 text-xs leading-relaxed">{s.reason}</p></div>))}
            </div>
          </div>
        </div>
      )}

      {/* Market Sub-Tab */}
      {imgTab === 'market' && (
        <div>
          <div className="card p-6 mb-6">
            <h3 className="text-white font-semibold text-lg mb-4">Global Earth Observation Market</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: '2024 Market Size', value: '$5.5B', color: 'text-cyan-400' },
                { label: '2028 Projected', value: '$8.3B', color: 'text-green-400' },
                { label: 'CAGR 2024-2030', value: '~12%', color: 'text-amber-400' },
                { label: 'Commercial EO Sats', value: '1,000+', color: 'text-purple-400' },
              ].map((stat) => (<div key={stat.label} className="bg-slate-700/30 rounded-xl p-4 text-center"><div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div><div className="text-star-400 text-xs uppercase tracking-widest mt-1">{stat.label}</div></div>))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-700/30 rounded-lg p-4"><h4 className="text-white font-semibold text-sm mb-2">Data Revenue</h4><p className="text-star-400 text-xs leading-relaxed">Satellite imagery data sales represent approximately 60% of the EO market. Archive sales continue growing as historical datasets become more valuable for AI training and change detection.</p></div>
              <div className="bg-slate-700/30 rounded-lg p-4"><h4 className="text-white font-semibold text-sm mb-2">Analytics / Value-Added</h4><p className="text-star-400 text-xs leading-relaxed">Value-added analytics represent the fastest-growing segment at 18-22% CAGR. Multiple providers report analytics revenue growing faster than raw data revenue.</p></div>
              <div className="bg-slate-700/30 rounded-lg p-4"><h4 className="text-white font-semibold text-sm mb-2">Government vs. Commercial</h4><p className="text-star-400 text-xs leading-relaxed">Government and defense remain the largest customer segment (~55% of revenue), but commercial adoption is accelerating in insurance, agriculture, energy, and finance.</p></div>
            </div>
          </div>
          <h3 className="text-white font-semibold text-lg mb-4">Key Market Trends</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {IMG_MARKET_TRENDS.map((trend) => (
              <div key={trend.title} className={`card p-6 ${trend.borderColor}`}>
                <h3 className={`text-lg font-semibold ${trend.color} mb-2`}>{trend.title}</h3>
                <p className="text-star-400 text-sm leading-relaxed mb-4">{trend.description}</p>
                <div className="space-y-2">{(trend.stats || []).map((stat, i) => (<div key={i} className="text-star-300 text-sm flex items-start gap-2"><span className={`mt-0.5 flex-shrink-0 ${trend.color}`}>-</span>{stat}</div>))}</div>
              </div>
            ))}
          </div>
          <div className="card p-6 mb-6">
            <h3 className="text-white font-semibold mb-4">Industry Evolution</h3>
            <div className="space-y-4">
              {[
                { era: '1999-2010', title: 'Pioneer Era', description: 'IKONOS (1m), QuickBird (60cm), WorldView-1 (50cm). First commercial high-resolution satellites. Government as primary customer.', color: 'text-star-400' },
                { era: '2010-2018', title: 'NewSpace Revolution', description: 'Planet launches Dove flock (3m daily). WorldView-3 achieves 31cm. Smallsat EO becomes viable. SAR microsatellites emerge (ICEYE).', color: 'text-blue-400' },
                { era: '2018-2023', title: 'Constellation Scale', description: 'Planet achieves daily global imaging. ICEYE and Capella deploy commercial SAR fleets. Maxar launches WorldView Legion (30cm). Pricing drops significantly.', color: 'text-cyan-400' },
                { era: '2024-2028', title: 'Multi-Modal & AI Era', description: 'Hyperspectral goes operational (Pixxel, Tanager). Thermal from space (SatVu). 10cm VLEO planned (Albedo). AI analytics become primary product. Market exceeds $8B.', color: 'text-green-400' },
              ].map((era) => (<div key={era.era} className="flex items-start gap-4"><div className={`text-sm font-mono font-bold flex-shrink-0 w-24 ${era.color}`}>{era.era}</div><div><h4 className="text-white font-semibold text-sm">{era.title}</h4><p className="text-star-400 text-xs leading-relaxed mt-1">{era.description}</p></div></div>))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="card p-6">
              <h3 className="text-white font-semibold mb-4">Market by Region</h3>
              <div className="space-y-3">
                {[
                  { region: 'North America', share: '38%', color: 'from-blue-500 to-blue-400', providers: 'Maxar, Planet, Capella, BlackSky, Umbra, Albedo' },
                  { region: 'Europe', share: '28%', color: 'from-cyan-500 to-cyan-400', providers: 'Airbus, ICEYE, SatVu' },
                  { region: 'Asia-Pacific', share: '22%', color: 'from-green-500 to-green-400', providers: 'Pixxel, Synspective' },
                  { region: 'Rest of World', share: '12%', color: 'from-amber-500 to-amber-400', providers: 'Satellogic, Wyvern, EarthDaily' },
                ].map((r) => (<div key={r.region}><div className="flex justify-between mb-1"><span className="text-white text-sm font-medium">{r.region}</span><span className="text-star-400 text-sm">{r.share}</span></div><div className="h-2 bg-slate-700/30 rounded-full overflow-hidden mb-1"><div className={`h-full rounded-full bg-gradient-to-r ${r.color}`} style={{ width: r.share }} /></div><p className="text-star-400 text-xs">{r.providers}</p></div>))}
              </div>
            </div>
            <div className="card p-6">
              <h3 className="text-white font-semibold mb-4">Market by Sensor Type</h3>
              <div className="space-y-3">
                {[
                  { type: 'Optical (VHR)', share: '45%', growth: '8% CAGR', color: 'from-blue-500 to-blue-400' },
                  { type: 'SAR', share: '25%', growth: '17% CAGR', color: 'from-cyan-500 to-cyan-400' },
                  { type: 'Multispectral (Med-Res)', share: '18%', growth: '10% CAGR', color: 'from-green-500 to-green-400' },
                  { type: 'Hyperspectral', share: '7%', growth: '25% CAGR', color: 'from-purple-500 to-purple-400' },
                  { type: 'Thermal / Other', share: '5%', growth: '20% CAGR', color: 'from-red-500 to-red-400' },
                ].map((s) => (<div key={s.type}><div className="flex justify-between mb-1"><span className="text-white text-sm font-medium">{s.type}</span><div className="flex items-center gap-3"><span className="text-green-400 text-xs">{s.growth}</span><span className="text-star-400 text-sm">{s.share}</span></div></div><div className="h-2 bg-slate-700/30 rounded-full overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${s.color}`} style={{ width: s.share }} /></div></div>))}
              </div>
            </div>
          </div>
          <div className="card p-5 border-dashed">
            <h3 className="text-sm font-semibold text-white mb-2">Data Sources & Methodology</h3>
            <p className="text-star-400 text-xs leading-relaxed">Market size estimates derived from Euroconsult, Northern Sky Research (NSR), and publicly available industry reports. Provider specifications sourced from official company documentation, SEC filings, and satellite operator disclosures. Resolution figures represent best-available modes under optimal conditions. Data as of early 2025.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

function ManufacturingAndImageryContent() {
  const searchParams = useSearchParams();
  const topTab = (searchParams.get('tab') === 'imagery' ? 'imagery' : 'manufacturing') as TopTabId;
  const [mfgTab, setMfgTab] = useState<MfgTabId>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mfgData, setMfgData] = useState<MfgDataContextType>({
    COMPANIES: FALLBACK_COMPANIES,
    ISS_EXPERIMENT_CATEGORIES: FALLBACK_ISS_EXPERIMENT_CATEGORIES,
    PRODUCT_CATEGORIES: FALLBACK_PRODUCT_CATEGORIES,
    MARKET_PROJECTIONS: FALLBACK_MARKET_PROJECTIONS,
    MANUFACTURING_PROCESSES: FALLBACK_MANUFACTURING_PROCESSES,
    SPACE_ENVIRONMENT_ADVANTAGES: FALLBACK_SPACE_ENVIRONMENT_ADVANTAGES,
    IMG_PROVIDERS: FALLBACK_IMG_PROVIDERS,
    IMG_USE_CASES: FALLBACK_IMG_USE_CASES,
    IMG_MARKET_TRENDS: FALLBACK_IMG_MARKET_TRENDS,
    IMG_HERO_STATS: FALLBACK_IMG_HERO_STATS,
    refreshedAt: null,
  });

  useEffect(() => {
    async function fetchData() {
      setError(null);
      try {
        const sections = [
          'companies', 'iss-experiments', 'products', 'market-projections',
          'img-providers', 'img-use-cases', 'img-market-trends', 'img-hero-stats',
        ];
        const responses = await Promise.all(
          sections.map((s) => fetch(`/api/content/space-manufacturing?section=${s}`).then((r) => r.json()))
        );

        const newData: Partial<MfgDataContextType> = {};
        if (responses[0]?.data?.length) newData.COMPANIES = responses[0].data;
        if (responses[1]?.data?.length) newData.ISS_EXPERIMENT_CATEGORIES = responses[1].data;
        if (responses[2]?.data?.length) newData.PRODUCT_CATEGORIES = responses[2].data;
        if (responses[3]?.data?.length) newData.MARKET_PROJECTIONS = responses[3].data;
        if (responses[4]?.data?.length) newData.IMG_PROVIDERS = responses[4].data;
        if (responses[5]?.data?.length) newData.IMG_USE_CASES = responses[5].data;
        if (responses[6]?.data?.length) newData.IMG_MARKET_TRENDS = responses[6].data;
        if (responses[7]?.data?.length) newData.IMG_HERO_STATS = responses[7].data;

        const latestRefresh = responses
          .map((r) => r.meta?.lastRefreshed)
          .filter(Boolean)
          .sort()
          .pop() || null;

        setMfgData((prev) => ({ ...prev, ...newData, refreshedAt: latestRefresh }));
      } catch (error) {
        clientLogger.error('Failed to fetch manufacturing data', { error: error instanceof Error ? error.message : String(error) });
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MfgDataContext.Provider value={mfgData}>
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Manufacturing & Imagery"
          subtitle="In-space manufacturing intelligence and satellite imagery marketplace -- pharmaceutical production, advanced materials, Earth observation providers, and the emerging orbital economy"
          icon="🏭"
          accentColor="emerald"
        />

        <DataFreshness refreshedAt={mfgData.refreshedAt} source="DynamicContent" />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Top-Level Tab Navigation */}
        <div className="border-b border-slate-700/50 mb-8">
          <div className="flex gap-1">
            <Link
              href="/space-manufacturing"
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                topTab === 'manufacturing'
                  ? 'border-nebula-500 text-nebula-300'
                  : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'
              }`}
            >
              <span className="mr-1.5">{'🏭'}</span>
              Space Manufacturing
            </Link>
            <Link
              href="/space-manufacturing?tab=imagery"
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                topTab === 'imagery'
                  ? 'border-cyan-500 text-cyan-300'
                  : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'
              }`}
            >
              <span className="mr-1.5">{'\uD83D\uDEF0\uFE0F'}</span>
              Imagery Marketplace
            </Link>
          </div>
        </div>

        {/* Manufacturing Content */}
        {topTab === 'manufacturing' && (
          <>
            {/* Manufacturing Sub-Tab Navigation */}
            <div className="border-b border-slate-700/50 mb-8">
              <div className="flex gap-1 overflow-x-auto">
                {MFG_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMfgTab(tab.id)}
                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      mfgTab === tab.id
                        ? 'border-nebula-500 text-nebula-300'
                        : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'
                    }`}
                  >
                    <span className="mr-1.5">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {mfgTab === 'overview' && <OverviewTab />}
            {mfgTab === 'companies' && <CompaniesTab />}
            {mfgTab === 'processes' && <ProcessesTab />}
            {mfgTab === 'iss-lab' && <ISSLabTab />}
            {mfgTab === 'products' && <ProductsTab />}
          </>
        )}

        {/* Imagery Marketplace Content */}
        {topTab === 'imagery' && <ImageryMarketplaceContent />}

        {/* Related Modules */}
        <ScrollReveal><div className="card p-4 mt-8">
          <h3 className="text-sm font-semibold text-white mb-3">Related Modules</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/space-mining" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Space Mining
            </Link>
            <Link href="/orbital-slots" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Orbital Services
            </Link>
            <Link href="/space-capital" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Space Capital
            </Link>
            <Link href="/supply-chain" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Supply Chain
            </Link>
            <Link href="/market-intel" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Market Intel
            </Link>
            <Link href="/resource-exchange" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Resource Exchange
            </Link>
          </div>
        </div></ScrollReveal>

            <ScrollReveal>
              <RelatedModules
                modules={[
              { name: 'Supply Chain', description: 'Space supply chain intelligence', href: '/supply-chain', icon: '🔗' },
              { name: 'Launch Vehicles', description: 'Rocket and launch system comparison', href: '/launch-vehicles', icon: '🚀' },
              { name: 'Marketplace', description: 'Find manufacturing service providers', href: '/marketplace', icon: '🏪' },
              { name: 'Business Opportunities', description: 'Manufacturing contracts and RFPs', href: '/business-opportunities', icon: '📋' },
                ]}
              />
            </ScrollReveal>

      </div>
    </div>
    </MfgDataContext.Provider>
  );
}

export default function SpaceManufacturingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-star-300">Loading...</div></div>}>
      <ManufacturingAndImageryContent />
    </Suspense>
  );
}
