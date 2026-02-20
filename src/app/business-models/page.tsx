'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { DonutChart } from '@/components/charts';
import { BUSINESS_MODELS, type BusinessModelTemplate } from '@/lib/business-model-data';

// ── Constants ──

const SECTOR_LABELS: Record<string, string> = {
  launch: 'Launch',
  earth_observation: 'Earth Observation',
  communications: 'Communications',
  ground_segment: 'Ground Segment',
  space_tourism: 'Space Tourism',
  in_space: 'In-Space',
  debris_removal: 'Debris / SSA',
  iot: 'IoT / M2M',
};

const SECTOR_COLORS: Record<string, string> = {
  launch: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  earth_observation: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  communications: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ground_segment: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  space_tourism: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  in_space: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  debris_removal: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  iot: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

const DONUT_COLORS: Array<'cyan' | 'purple' | 'amber' | 'emerald' | 'rose' | 'slate'> = [
  'cyan', 'purple', 'amber', 'emerald', 'rose', 'slate',
];

// ── Sub-components ──

function ModelCard({
  model,
  onExpand,
  onCompare,
  isCompareSelected,
}: {
  model: BusinessModelTemplate;
  onExpand: () => void;
  onCompare: () => void;
  isCompareSelected: boolean;
}) {
  const sectorColor = SECTOR_COLORS[model.sector] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="card p-5 cursor-pointer relative overflow-hidden group"
      onClick={onExpand}
    >
      {/* Compare checkbox */}
      <div
        className="absolute top-3 right-3 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onCompare();
        }}
      >
        <button
          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            isCompareSelected
              ? 'bg-cyan-500 border-cyan-500 text-white'
              : 'border-slate-600 hover:border-cyan-400 text-transparent hover:text-slate-500'
          }`}
          title="Select for comparison"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl flex-shrink-0">{model.icon}</span>
        <div className="min-w-0">
          <h3 className="font-semibold text-white text-sm group-hover:text-cyan-400 transition-colors">
            {model.name}
          </h3>
          <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border mt-1 ${sectorColor}`}>
            {SECTOR_LABELS[model.sector] || model.sector}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
        {model.description}
      </p>

      <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Revenue Model</div>
        <p className="text-xs text-slate-300 line-clamp-2">{model.revenueModel}</p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Break-even</div>
          <div className="text-xs text-amber-400 font-medium mt-0.5 line-clamp-1">{model.breakEvenEstimate.split('.')[0]}</div>
        </div>
        <div className="text-[10px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Click to expand &rarr;
        </div>
      </div>
    </motion.div>
  );
}

function MetricsTable({ metrics }: { metrics: { label: string; benchmark: string; description: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left text-xs text-slate-500 font-medium py-2 pr-4">Metric</th>
            <th className="text-left text-xs text-slate-500 font-medium py-2 pr-4">Benchmark</th>
            <th className="text-left text-xs text-slate-500 font-medium py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => (
            <tr key={i} className="border-b border-slate-800/50">
              <td className="py-2.5 pr-4 text-xs font-medium text-white whitespace-nowrap">{m.label}</td>
              <td className="py-2.5 pr-4 text-xs text-cyan-400 font-semibold whitespace-nowrap">{m.benchmark}</td>
              <td className="py-2.5 text-xs text-slate-400">{m.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnitEconomicsTable({ data }: { data: { metric: string; value: string; notes: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left text-xs text-slate-500 font-medium py-2 pr-4">Metric</th>
            <th className="text-left text-xs text-slate-500 font-medium py-2 pr-4">Value</th>
            <th className="text-left text-xs text-slate-500 font-medium py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i} className="border-b border-slate-800/50">
              <td className="py-2.5 pr-4 text-xs font-medium text-white">{d.metric}</td>
              <td className="py-2.5 pr-4 text-xs text-emerald-400 font-semibold whitespace-nowrap">{d.value}</td>
              <td className="py-2.5 text-xs text-slate-400">{d.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FundingTable({ data }: { data: { stage: string; typical: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {data.map((d, i) => (
        <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">{d.stage}</div>
          <div className="text-sm font-bold text-purple-400 mt-1">{d.typical}</div>
        </div>
      ))}
    </div>
  );
}

function CostStructureChart({ data }: { data: { category: string; percentage: number; description: string }[] }) {
  const chartData = data.map((d, i) => ({
    label: d.category,
    value: d.percentage,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  return (
    <DonutChart
      data={chartData}
      size={200}
      thickness={25}
      centerLabel="Cost"
      centerValue="100%"
      valueFormatter={(v) => `${v}%`}
    />
  );
}

function ExpandedModelView({
  model,
  onClose,
}: {
  model: BusinessModelTemplate;
  onClose: () => void;
}) {
  const sectorColor = SECTOR_COLORS[model.sector] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Back button */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all models
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4 mb-4">
          <span className="text-4xl">{model.icon}</span>
          <div>
            <h2 className="text-2xl font-bold text-white">{model.name}</h2>
            <span className={`inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full border mt-1 ${sectorColor}`}>
              {SECTOR_LABELS[model.sector] || model.sector}
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{model.description}</p>
      </div>

      {/* Revenue Model */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-white mb-3">Revenue Model</h3>
        <p className="text-sm text-slate-300 leading-relaxed">{model.revenueModel}</p>
      </div>

      {/* Key Metrics */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-white mb-4">Key Metrics & Benchmarks</h3>
        <MetricsTable metrics={model.keyMetrics} />
      </div>

      {/* Cost Structure + Unit Economics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-4">Cost Structure</h3>
          <CostStructureChart data={model.costStructure} />
          <div className="mt-4 space-y-2">
            {model.costStructure.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-slate-500 font-mono w-8 flex-shrink-0">{c.percentage}%</span>
                <span className="text-slate-300">
                  <span className="font-medium text-white">{c.category}</span> &mdash; {c.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-4">Unit Economics</h3>
          <UnitEconomicsTable data={model.unitEconomics} />
        </div>
      </div>

      {/* Funding Benchmarks */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-white mb-4">Funding Benchmarks by Stage</h3>
        <FundingTable data={model.fundingBenchmarks} />
      </div>

      {/* Break-Even */}
      <div className="card p-6 border-amber-500/20 bg-amber-500/5">
        <h3 className="text-base font-semibold text-white mb-2">Break-Even Estimate</h3>
        <p className="text-sm text-amber-300 leading-relaxed">{model.breakEvenEstimate}</p>
      </div>
    </motion.div>
  );
}

function CompareView({
  models,
  onClose,
}: {
  models: [BusinessModelTemplate, BusinessModelTemplate];
  onClose: () => void;
}) {
  const [a, b] = models;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Back button */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to all models
      </button>

      <h2 className="text-xl font-bold text-white">Side-by-Side Comparison</h2>

      {/* Header row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[a, b].map((model) => {
          const sectorColor = SECTOR_COLORS[model.sector] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
          return (
            <div key={model.id} className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{model.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-white">{model.name}</h3>
                  <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border mt-1 ${sectorColor}`}>
                    {SECTOR_LABELS[model.sector] || model.sector}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{model.description}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue Model */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-white mb-4">Revenue Model</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[a, b].map((model) => (
            <div key={model.id} className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-xs text-cyan-400 font-medium mb-1">{model.name}</div>
              <p className="text-xs text-slate-300 leading-relaxed">{model.revenueModel}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-white mb-4">Key Metrics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[a, b].map((model) => (
            <div key={model.id}>
              <div className="text-xs text-cyan-400 font-medium mb-2">{model.name}</div>
              <MetricsTable metrics={model.keyMetrics} />
            </div>
          ))}
        </div>
      </div>

      {/* Cost Structure */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-white mb-4">Cost Structure</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[a, b].map((model) => (
            <div key={model.id}>
              <div className="text-xs text-cyan-400 font-medium mb-3">{model.name}</div>
              <CostStructureChart data={model.costStructure} />
            </div>
          ))}
        </div>
      </div>

      {/* Unit Economics */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-white mb-4">Unit Economics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[a, b].map((model) => (
            <div key={model.id}>
              <div className="text-xs text-cyan-400 font-medium mb-2">{model.name}</div>
              <UnitEconomicsTable data={model.unitEconomics} />
            </div>
          ))}
        </div>
      </div>

      {/* Funding Benchmarks */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-white mb-4">Funding Benchmarks</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[a, b].map((model) => (
            <div key={model.id}>
              <div className="text-xs text-cyan-400 font-medium mb-2">{model.name}</div>
              <FundingTable data={model.fundingBenchmarks} />
            </div>
          ))}
        </div>
      </div>

      {/* Break-Even */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-white mb-4">Break-Even Estimate</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[a, b].map((model) => (
            <div key={model.id} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <div className="text-xs text-cyan-400 font-medium mb-1">{model.name}</div>
              <p className="text-sm text-amber-300 leading-relaxed">{model.breakEvenEstimate}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ──

export default function BusinessModelsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  const sectors = useMemo(() => {
    const unique = Array.from(new Set(BUSINESS_MODELS.map((m) => m.sector)));
    return unique;
  }, []);

  const filteredModels = useMemo(() => {
    if (sectorFilter === 'all') return BUSINESS_MODELS;
    return BUSINESS_MODELS.filter((m) => m.sector === sectorFilter);
  }, [sectorFilter]);

  const expandedModel = useMemo(
    () => BUSINESS_MODELS.find((m) => m.id === expandedId) || null,
    [expandedId]
  );

  const compareModels = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const a = BUSINESS_MODELS.find((m) => m.id === compareIds[0]);
    const b = BUSINESS_MODELS.find((m) => m.id === compareIds[1]);
    if (!a || !b) return null;
    return [a, b] as [BusinessModelTemplate, BusinessModelTemplate];
  }, [compareIds]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // Replace oldest
      return [...prev, id];
    });
  };

  const handleExpand = (id: string) => {
    setExpandedId(id);
    setShowCompare(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartCompare = () => {
    if (compareIds.length === 2) {
      setShowCompare(true);
      setExpandedId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToGrid = () => {
    setExpandedId(null);
    setShowCompare(false);
  };

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <AnimatedPageHeader
        title="Space Business Model Templates"
        subtitle="Use real industry benchmarks to build your financial projections"
        icon={'\u{1F4BC}'}
        accentColor="purple"
      />

      <AnimatePresence mode="wait">
        {/* Expanded single model */}
        {expandedModel && !showCompare && (
          <ExpandedModelView
            key={expandedModel.id}
            model={expandedModel}
            onClose={handleBackToGrid}
          />
        )}

        {/* Compare view */}
        {showCompare && compareModels && (
          <CompareView
            key="compare"
            models={compareModels}
            onClose={handleBackToGrid}
          />
        )}

        {/* Grid view */}
        {!expandedModel && !showCompare && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">{BUSINESS_MODELS.length}</div>
                <div className="text-xs text-slate-400 mt-1">Model Templates</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{sectors.length}</div>
                <div className="text-xs text-slate-400 mt-1">Sectors Covered</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {BUSINESS_MODELS.reduce((sum, m) => sum + m.keyMetrics.length, 0)}
                </div>
                <div className="text-xs text-slate-400 mt-1">Benchmark Metrics</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {BUSINESS_MODELS.reduce((sum, m) => sum + m.fundingBenchmarks.length, 0)}
                </div>
                <div className="text-xs text-slate-400 mt-1">Funding Data Points</div>
              </div>
            </motion.div>

            {/* Filters + compare bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              {/* Sector filter */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSectorFilter('all')}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    sectorFilter === 'all'
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  All Sectors
                </button>
                {sectors.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSectorFilter(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      sectorFilter === s
                        ? SECTOR_COLORS[s] || 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                        : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    {SECTOR_LABELS[s] || s}
                  </button>
                ))}
              </div>

              {/* Compare button */}
              <button
                onClick={handleStartCompare}
                disabled={compareIds.length !== 2}
                className={`flex items-center gap-2 text-xs px-4 py-2 rounded-lg border transition-all flex-shrink-0 ${
                  compareIds.length === 2
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30 cursor-pointer'
                    : 'bg-slate-800/30 text-slate-500 border-slate-700/30 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare {compareIds.length === 2 ? '(2 selected)' : `(${compareIds.length}/2)`}
              </button>
            </div>

            {/* Model grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
              {filteredModels.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  onExpand={() => handleExpand(model.id)}
                  onCompare={() => toggleCompare(model.id)}
                  isCompareSelected={compareIds.includes(model.id)}
                />
              ))}
            </div>

            {/* Methodology */}
            <div className="card p-6 border-slate-700/30">
              <h3 className="text-sm font-semibold text-white mb-2">About These Templates</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Business model templates are based on publicly available data from industry reports, SEC filings,
                investor presentations, and analyst research. Benchmarks represent typical ranges and may vary
                significantly based on specific technology choices, geography, and market conditions. These templates
                are intended as starting points for financial modeling, not as investment advice.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['Industry Reports', 'SEC Filings', 'Investor Decks', 'Analyst Research', 'Public Data'].map((src) => (
                  <span key={src} className="text-[10px] px-2 py-0.5 rounded bg-slate-800/50 text-slate-500 border border-slate-700/30">
                    {src}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
