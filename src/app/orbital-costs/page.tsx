'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import {
  ORBITAL_SYSTEMS,
  getAllCategories,
  formatCostCompact,
  formatMass,
  getTRLLabel,
  getTRLColor,
  type OrbitalSystem,
  type Subsystem,
  type BOMItem,
} from '@/lib/orbital-costs-data';

// ────────────────────────────────────────
// Cost Breakdown Bar Chart
// ────────────────────────────────────────

function CostBreakdownChart({ system }: { system: OrbitalSystem }) {
  const items = [
    { label: 'Procurement', value: system.costBreakdown.procurement, color: 'bg-blue-500' },
    { label: 'Launch', value: system.costBreakdown.launch, color: 'bg-indigo-500' },
    { label: 'Assembly', value: system.costBreakdown.assembly, color: 'bg-purple-500' },
    { label: 'Testing', value: system.costBreakdown.testing, color: 'bg-pink-500' },
    { label: 'Operations (Yr 1)', value: system.costBreakdown.operations, color: 'bg-orange-500' },
    { label: 'Insurance (Yr 1)', value: system.costBreakdown.insurance, color: 'bg-yellow-500' },
    { label: 'Regulatory', value: system.costBreakdown.regulatory, color: 'bg-teal-500' },
    { label: 'Contingency', value: system.costBreakdown.contingency, color: 'bg-gray-500' },
  ];
  const maxVal = Math.max(...items.map((i) => i.value));

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 text-xs text-gray-400 text-right shrink-0">{item.label}</span>
          <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
            <div
              className={`h-full ${item.color} rounded transition-all duration-500`}
              style={{ width: `${(item.value / maxVal) * 100}%` }}
            />
          </div>
          <span className="w-20 text-xs text-gray-300 text-right shrink-0">
            {formatCostCompact(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────
// Bill of Materials Table
// ────────────────────────────────────────

function BOMTable({ subsystems }: { subsystems: Subsystem[] }) {
  const [expandedSubsystem, setExpandedSubsystem] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {subsystems.map((sub) => (
        <div key={sub.name} className="border border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSubsystem(expandedSubsystem === sub.name ? null : sub.name)}
            className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 transition-colors text-left"
          >
            <div className="flex-1">
              <span className="text-sm font-medium text-white">{sub.name}</span>
              <span className="text-xs text-gray-400 ml-2">
                {formatMass(sub.massKg)} | {formatCostCompact(sub.costUSD)}
              </span>
            </div>
            <span className="text-gray-400 text-sm">
              {expandedSubsystem === sub.name ? '−' : '+'}
            </span>
          </button>

          {expandedSubsystem === sub.name && (
            <div className="p-3 bg-gray-900/50">
              <p className="text-xs text-gray-400 mb-3">{sub.description}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-1.5 px-2 text-gray-400 font-medium">Item</th>
                      <th className="text-center py-1.5 px-2 text-gray-400 font-medium">Qty</th>
                      <th className="text-right py-1.5 px-2 text-gray-400 font-medium">Unit Mass</th>
                      <th className="text-right py-1.5 px-2 text-gray-400 font-medium">Total Mass</th>
                      <th className="text-right py-1.5 px-2 text-gray-400 font-medium">Unit Cost</th>
                      <th className="text-right py-1.5 px-2 text-gray-400 font-medium">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sub.items.map((item: BOMItem, idx: number) => (
                      <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/30">
                        <td className="py-1.5 px-2 text-gray-200">
                          {item.name}
                          {item.supplier && (
                            <span className="text-gray-500 block text-[10px]">{item.supplier}</span>
                          )}
                          {item.notes && (
                            <span className="text-gray-500 block text-[10px] italic">{item.notes}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center text-gray-300">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-right text-gray-300">
                          {formatMass(item.unitMassKg)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-gray-300">
                          {formatMass(item.totalMassKg)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-gray-300">
                          {formatCostCompact(item.unitCostUSD)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-white font-medium">
                          {formatCostCompact(item.totalCostUSD)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-600">
                      <td className="py-1.5 px-2 text-gray-200 font-medium" colSpan={3}>
                        Subtotal
                      </td>
                      <td className="py-1.5 px-2 text-right text-white font-medium">
                        {formatMass(sub.massKg)}
                      </td>
                      <td className="py-1.5 px-2" />
                      <td className="py-1.5 px-2 text-right text-white font-bold">
                        {formatCostCompact(sub.costUSD)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────
// Insurance Section
// ────────────────────────────────────────

function InsuranceSection({ system }: { system: OrbitalSystem }) {
  const ins = system.insurance;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400">Insured Value</div>
          <div className="text-lg font-bold text-white">{formatCostCompact(ins.insuredValue)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400">Total First-Year Premium</div>
          <div className="text-lg font-bold text-yellow-400">
            {formatCostCompact(ins.totalFirstYearUSD)}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-sm text-gray-300">Launch Insurance</span>
          <div className="text-right">
            <span className="text-sm text-white font-medium">
              {formatCostCompact(ins.launchPremiumUSD)}
            </span>
            <span className="text-xs text-gray-400 ml-1">({ins.launchPremiumRate.toFixed(1)}%)</span>
          </div>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-sm text-gray-300">In-Orbit Annual</span>
          <div className="text-right">
            <span className="text-sm text-white font-medium">
              {formatCostCompact(ins.inOrbitAnnualUSD)}
            </span>
            <span className="text-xs text-gray-400 ml-1">({ins.inOrbitPremiumRate.toFixed(1)}%)</span>
          </div>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-sm text-gray-300">Third-Party Liability</span>
          <div className="text-right">
            <span className="text-sm text-white font-medium">
              {formatCostCompact(ins.liabilityAnnualUSD)}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 italic">{ins.notes}</p>

      <Link
        href="/space-insurance"
        className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        View Space Insurance Tracker &rarr;
      </Link>
    </div>
  );
}

// ────────────────────────────────────────
// System Detail Panel
// ────────────────────────────────────────

function SystemDetail({ system, onClose }: { system: OrbitalSystem; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'costs' | 'bom' | 'insurance'>('costs');

  const tabs = [
    { id: 'costs' as const, label: 'Cost Breakdown' },
    { id: 'bom' as const, label: 'Bill of Materials' },
    { id: 'insurance' as const, label: 'Insurance Estimate' },
  ];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6 mt-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{system.icon}</span>
            <h3 className="text-xl font-bold text-white">
              {system.name}
              {system.variant && (
                <span className="text-gray-400 font-normal text-base ml-2">{system.variant}</span>
              )}
            </h3>
          </div>
          <p className="text-sm text-gray-400 mt-1 max-w-3xl">{system.description}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1 text-xl leading-none"
          aria-label="Close detail view"
        >
          &times;
        </button>
      </div>

      {/* Key specs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total Cost', value: formatCostCompact(system.costBreakdown.total), highlight: true },
          { label: 'Mass', value: formatMass(system.totalMassKg) },
          { label: 'Orbit', value: system.orbit },
          { label: 'Power', value: `${system.powerKw.toLocaleString()} kW` },
          { label: 'Crew', value: system.crewCapacity > 0 ? `${system.crewCapacity} crew` : 'Uncrewed' },
          { label: 'Design Life', value: `${system.designLifeYears} years` },
        ].map((spec) => (
          <div key={spec.label} className="bg-gray-800/50 rounded-lg px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">{spec.label}</div>
            <div className={`text-sm font-semibold ${spec.highlight ? 'text-green-400' : 'text-white'}`}>
              {spec.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-4 border-b border-gray-700 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === 'costs' && (
          <div className="space-y-6">
            <CostBreakdownChart system={system} />

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Annual Operating Costs</h4>
              <div className="text-lg font-bold text-orange-400">
                {formatCostCompact(system.annualOperatingCostUSD)}/year
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Revenue Model Notes</h4>
              <ul className="space-y-1">
                {system.revenueModelNotes.map((note, i) => (
                  <li key={i} className="text-xs text-gray-400 flex gap-2">
                    <span className="text-gray-600 shrink-0">&bull;</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Reference Programs</h4>
              <div className="flex flex-wrap gap-2">
                {system.referencePrograms.map((ref, i) => (
                  <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                    {ref}
                  </span>
                ))}
              </div>
            </div>

            {/* Cross-links */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
              {system.crossLinks.insurancePage && (
                <Link href="/space-insurance" className="text-xs text-blue-400 hover:text-blue-300">
                  Space Insurance &rarr;
                </Link>
              )}
              {system.crossLinks.resourceExchange && (
                <Link href="/resource-exchange" className="text-xs text-blue-400 hover:text-blue-300">
                  Resource Exchange &rarr;
                </Link>
              )}
              {system.crossLinks.launchVehicles && (
                <Link href="/launch-vehicles" className="text-xs text-blue-400 hover:text-blue-300">
                  Launch Vehicles &rarr;
                </Link>
              )}
              {system.crossLinks.missionCost && (
                <Link href="/mission-cost" className="text-xs text-blue-400 hover:text-blue-300">
                  Mission Cost Simulator &rarr;
                </Link>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bom' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">
                {system.subsystems.length} subsystems |{' '}
                {system.subsystems.reduce((a, s) => a + s.items.length, 0)} line items
              </p>
              <div className="text-xs text-gray-500">
                Total mass: <span className="text-white">{formatMass(system.totalMassKg)}</span>
              </div>
            </div>
            <BOMTable subsystems={system.subsystems} />
          </div>
        )}

        {activeTab === 'insurance' && <InsuranceSection system={system} />}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// System Card
// ────────────────────────────────────────

function SystemCard({
  system,
  isSelected,
  onClick,
}: {
  system: OrbitalSystem;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left w-full p-4 rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'bg-gray-800 border-blue-500 ring-1 ring-blue-500/30'
          : 'bg-gray-900/60 border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{system.icon}</span>
        <span className={`text-[10px] uppercase tracking-wider font-medium ${getTRLColor(system.techReadinessLevel)}`}>
          TRL {system.techReadinessLevel}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-white leading-tight">{system.name}</h3>
      {system.variant && (
        <p className="text-xs text-gray-400 mt-0.5">{system.variant}</p>
      )}

      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Total Cost</span>
          <span className="text-green-400 font-semibold">
            {formatCostCompact(system.costBreakdown.total)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Mass</span>
          <span className="text-gray-300">{formatMass(system.totalMassKg)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Orbit</span>
          <span className="text-gray-300">{system.orbit}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Insurance (Yr 1)</span>
          <span className="text-yellow-400">{formatCostCompact(system.insurance.totalFirstYearUSD)}</span>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 mt-3 line-clamp-2">{system.description}</p>

      <div className="mt-3 text-xs text-blue-400 font-medium">
        {isSelected ? 'Click to close' : 'View details'}
      </div>
    </button>
  );
}

// ────────────────────────────────────────
// Summary Statistics
// ────────────────────────────────────────

function SummaryStats() {
  const totalSystems = ORBITAL_SYSTEMS.length;
  const minCost = Math.min(...ORBITAL_SYSTEMS.map((s) => s.costBreakdown.total));
  const maxCost = Math.max(...ORBITAL_SYSTEMS.map((s) => s.costBreakdown.total));
  const totalBOMItems = ORBITAL_SYSTEMS.reduce(
    (a, s) => a + s.subsystems.reduce((b, sub) => b + sub.items.length, 0),
    0
  );
  const categories = getAllCategories();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">Systems Analyzed</div>
        <div className="text-xl font-bold text-white">{totalSystems}</div>
        <div className="text-[10px] text-gray-400">{categories.length} categories</div>
      </div>
      <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">Cost Range</div>
        <div className="text-xl font-bold text-green-400">{formatCostCompact(minCost)}</div>
        <div className="text-[10px] text-gray-400">to {formatCostCompact(maxCost)}</div>
      </div>
      <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">BOM Items</div>
        <div className="text-xl font-bold text-blue-400">{totalBOMItems}</div>
        <div className="text-[10px] text-gray-400">across all systems</div>
      </div>
      <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">TRL Range</div>
        <div className="text-xl font-bold text-purple-400">
          {Math.min(...ORBITAL_SYSTEMS.map((s) => s.techReadinessLevel))}-
          {Math.max(...ORBITAL_SYSTEMS.map((s) => s.techReadinessLevel))}
        </div>
        <div className="text-[10px] text-gray-400">concept to prototype</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function OrbitalCostsPage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'cost-asc' | 'cost-desc' | 'mass' | 'trl'>('cost-asc');
  const detailRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => getAllCategories(), []);

  // Auto-scroll to detail panel when a system is selected
  useEffect(() => {
    if (selectedSlug && detailRef.current) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [selectedSlug]);

  const filteredSystems = useMemo(() => {
    let systems = [...ORBITAL_SYSTEMS];

    if (categoryFilter !== 'all') {
      systems = systems.filter((s) => s.category === categoryFilter);
    }

    switch (sortBy) {
      case 'cost-asc':
        systems.sort((a, b) => a.costBreakdown.total - b.costBreakdown.total);
        break;
      case 'cost-desc':
        systems.sort((a, b) => b.costBreakdown.total - a.costBreakdown.total);
        break;
      case 'mass':
        systems.sort((a, b) => a.totalMassKg - b.totalMassKg);
        break;
      case 'trl':
        systems.sort((a, b) => b.techReadinessLevel - a.techReadinessLevel);
        break;
    }

    return systems;
  }, [categoryFilter, sortBy]);

  const selectedSystem = selectedSlug
    ? ORBITAL_SYSTEMS.find((s) => s.slug === selectedSlug)
    : null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <PageHeader
          title="Estimated Orbital System Costs"
          subtitle="Comprehensive cost analysis for next-generation orbital infrastructure. Select a system to explore detailed cost breakdowns, bill of materials, and insurance estimates."
          breadcrumbs={[
            { label: 'Mission Planning', href: '/mission-cost' },
            { label: 'Orbital System Costs' },
          ]}
        />

        {/* Summary Stats */}
        <SummaryStats />

        {/* Filters & Sort */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All ({ORBITAL_SYSTEMS.length})</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label} ({cat.count})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="cost-asc">Cost (Low to High)</option>
              <option value="cost-desc">Cost (High to Low)</option>
              <option value="mass">Mass (Lightest First)</option>
              <option value="trl">TRL (Highest First)</option>
            </select>
          </div>

          <span className="text-xs text-gray-500 ml-auto">
            {filteredSystems.length} system{filteredSystems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* System Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSystems.map((system) => (
            <SystemCard
              key={system.slug}
              system={system}
              isSelected={selectedSlug === system.slug}
              onClick={() =>
                setSelectedSlug(selectedSlug === system.slug ? null : system.slug)
              }
            />
          ))}
        </div>

        {/* Expanded Detail Panel */}
        {selectedSystem && (
          <div ref={detailRef} className="scroll-mt-4">
            <SystemDetail
              system={selectedSystem}
              onClose={() => setSelectedSlug(null)}
            />
          </div>
        )}

        {/* Methodology Note */}
        <div className="mt-12 bg-gray-900/40 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Methodology & Disclaimers</h3>
          <div className="text-xs text-gray-500 space-y-2">
            <p>
              Cost estimates are derived from publicly available data including NASA CLD program awards,
              commercial space company disclosures (Axiom, Vast, Varda, ClearSpace), ISS historical costs,
              ESA SOLARIS studies, and industry reports. Launch costs assume Falcon Heavy as the baseline
              current vehicle (~$1,500/kg to LEO).
            </p>
            <p>
              Insurance rates are based on industry benchmarks: ~8.5% launch premium, ~4.4% in-orbit annual,
              and ~1.8% third-party liability. Actual premiums vary significantly based on operator track record,
              mission specifics, and underwriter assessment.
            </p>
            <p>
              All figures are rough order-of-magnitude (ROM) estimates intended for planning purposes only.
              Actual costs will depend on procurement strategy, manufacturing maturity, regulatory environment,
              and market conditions. Contingency reserves of 15-20% are included.
            </p>
          </div>
        </div>

        {/* Related Modules */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/mission-cost', icon: '💰', label: 'Mission Cost Simulator', desc: 'Estimate launch costs by provider' },
            { href: '/space-insurance', icon: '🛡️', label: 'Space Insurance', desc: 'Insurance market & premium tracker' },
            { href: '/resource-exchange', icon: '💎', label: 'Resource Exchange', desc: 'Materials & propellant pricing' },
            { href: '/launch-vehicles', icon: '🚀', label: 'Launch Vehicles', desc: 'Compare vehicle capabilities' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 p-3 bg-gray-900/60 border border-gray-700 rounded-lg hover:border-gray-500 hover:bg-gray-800/50 transition-all"
            >
              <span className="text-xl">{link.icon}</span>
              <div>
                <div className="text-sm font-medium text-white">{link.label}</div>
                <div className="text-[10px] text-gray-400">{link.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
