'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  CUBESAT_STANDARDS,
  SMALLSAT_PLATFORMS,
  SUBSYSTEM_CATEGORIES,
  MISSION_TEMPLATES,
} from './reference-data';
import type { MissionTemplate, SubsystemOption } from './reference-data';

// ── Types ──

interface SelectedSubsystems {
  [categoryId: string]: string; // category id -> option id
}

interface BudgetSummary {
  totalMass: number;
  totalPower: number;
  totalCost: number;
  items: {
    category: string;
    categoryName: string;
    optionName: string;
    mass: number;
    power: number;
    cost: number;
  }[];
  payloadMassRemaining: number;
  payloadPowerRemaining: number;
  busClass: string;
  warnings: string[];
}

// ── Budget Calculator ──

function calculateBudget(selections: SelectedSubsystems, payloadMass: number, payloadPower: number): BudgetSummary {
  const items: BudgetSummary['items'] = [];
  let totalMass = 0;
  let totalPower = 0;
  let totalCost = 0;
  const warnings: string[] = [];

  for (const cat of SUBSYSTEM_CATEGORIES) {
    const selectedId = selections[cat.id];
    if (!selectedId) continue;
    const option = cat.options.find(o => o.id === selectedId);
    if (!option) continue;

    items.push({
      category: cat.id,
      categoryName: cat.abbreviation,
      optionName: option.name,
      mass: option.mass,
      power: option.power,
      cost: option.cost,
    });

    totalMass += option.mass;
    totalPower += option.power;
    totalCost += option.cost;
  }

  // Add payload
  totalMass += payloadMass;
  totalPower += payloadPower;

  // Determine best-fit bus class
  let busClass = 'Custom';
  if (totalMass <= 1.33) busClass = '1U CubeSat (1.33 kg max)';
  else if (totalMass <= 4.0) busClass = '3U CubeSat (4.0 kg max)';
  else if (totalMass <= 12.0) busClass = '6U CubeSat (12.0 kg max)';
  else if (totalMass <= 24.0) busClass = '12U CubeSat (24.0 kg max)';
  else if (totalMass <= 100) busClass = 'Microsatellite (10-100 kg)';
  else if (totalMass <= 180) busClass = 'ESPA-Class (60-180 kg)';
  else if (totalMass <= 500) busClass = 'Minisatellite (100-500 kg)';
  else busClass = 'Full-Size Satellite (500+ kg)';

  // Calculate payload remaining for CubeSat/SmallSat classes
  let massLimit = 0;
  if (totalMass <= 1.33) massLimit = 1.33;
  else if (totalMass <= 4.0) massLimit = 4.0;
  else if (totalMass <= 12.0) massLimit = 12.0;
  else if (totalMass <= 24.0) massLimit = 24.0;
  else if (totalMass <= 180) massLimit = 180;
  else if (totalMass <= 500) massLimit = 500;
  else massLimit = totalMass * 1.2;

  const payloadMassRemaining = massLimit - totalMass;

  // Power budget estimates (orbit average from EPS selection)
  const epsOption = SUBSYSTEM_CATEGORIES.find(c => c.id === 'eps')?.options.find(o => o.id === selections.eps);
  const availablePower = epsOption?.power || 0;
  const payloadPowerRemaining = availablePower - totalPower + (epsOption?.power || 0);

  // Warnings
  if (payloadMassRemaining < 0) {
    warnings.push(`Mass budget exceeded by ${Math.abs(payloadMassRemaining).toFixed(2)} kg for ${busClass}`);
  }
  if (totalPower > availablePower && availablePower > 0) {
    warnings.push(`Power draw (${totalPower.toFixed(1)} W) exceeds EPS capacity (${availablePower} W)`);
  }
  const propOption = SUBSYSTEM_CATEGORIES.find(c => c.id === 'propulsion')?.options.find(o => o.id === selections.propulsion);
  if (propOption && propOption.power > 0 && propOption.power > availablePower * 0.6) {
    warnings.push('Electric propulsion may require dedicated power mode (draws >60% of EPS capacity)');
  }

  return {
    totalMass,
    totalPower,
    totalCost,
    items,
    payloadMassRemaining,
    payloadPowerRemaining: Math.max(0, availablePower - totalPower),
    busClass,
    warnings,
  };
}

// ── Budget Display ──

function BudgetDisplay({ budget }: { budget: BudgetSummary }) {
  const massPercents = useMemo(() => {
    if (budget.totalMass === 0) return {};
    const percents: Record<string, number> = {};
    for (const item of budget.items) {
      percents[item.category] = (item.mass / budget.totalMass) * 100;
    }
    return percents;
  }, [budget]);

  const categoryColors: Record<string, string> = {
    adcs: 'bg-blue-500',
    eps: 'bg-yellow-500',
    cdh: 'bg-green-500',
    comms: 'bg-purple-500',
    propulsion: 'bg-red-500',
    thermal: 'bg-orange-500',
    structure: 'bg-slate-500',
  };

  return (
    <div className="card p-5 border border-cyan-500/30 bg-slate-800/50">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Mass / Power / Cost Budget
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <span className="text-xs text-slate-300 block">Total Mass</span>
          <span className="text-xl font-bold text-white">{budget.totalMass.toFixed(2)}</span>
          <span className="text-xs text-slate-400 ml-1">kg</span>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <span className="text-xs text-slate-300 block">Total Power</span>
          <span className="text-xl font-bold text-yellow-400">{budget.totalPower.toFixed(1)}</span>
          <span className="text-xs text-slate-400 ml-1">W</span>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <span className="text-xs text-slate-300 block">Est. Cost</span>
          <span className="text-xl font-bold text-green-400">${budget.totalCost.toLocaleString()}</span>
          <span className="text-xs text-slate-400 ml-1">K</span>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <span className="text-xs text-slate-300 block">Best-Fit Bus</span>
          <span className="text-sm font-bold text-cyan-400">{budget.busClass}</span>
        </div>
      </div>

      {/* Mass Breakdown Bar */}
      {budget.totalMass > 0 && (
        <div className="mb-5">
          <span className="text-xs text-slate-300 block mb-1.5">Mass Breakdown</span>
          <div className="flex rounded-lg overflow-hidden h-6">
            {budget.items.filter(i => i.mass > 0).map(item => (
              <div
                key={item.category}
                className={`${categoryColors[item.category] || 'bg-slate-600'} relative group`}
                style={{ width: `${massPercents[item.category] || 0}%`, minWidth: massPercents[item.category] && massPercents[item.category] > 0 ? '2px' : '0' }}
                title={`${item.categoryName}: ${item.mass.toFixed(2)} kg (${(massPercents[item.category] || 0).toFixed(0)}%)`}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    {item.categoryName}: {item.mass.toFixed(2)} kg
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {budget.items.filter(i => i.mass > 0).map(item => (
              <span key={item.category} className="flex items-center gap-1 text-xs text-slate-400">
                <span className={`w-2.5 h-2.5 rounded-sm ${categoryColors[item.category] || 'bg-slate-600'}`} />
                {item.categoryName} ({item.mass.toFixed(2)} kg)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Table */}
      {budget.items.length > 0 && (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-2 px-2 text-slate-300 font-medium">Subsystem</th>
                <th className="text-left py-2 px-2 text-slate-300 font-medium">Selection</th>
                <th className="text-right py-2 px-2 text-slate-300 font-medium">Mass (kg)</th>
                <th className="text-right py-2 px-2 text-slate-300 font-medium">Power (W)</th>
                <th className="text-right py-2 px-2 text-slate-300 font-medium">Cost ($K)</th>
              </tr>
            </thead>
            <tbody>
              {budget.items.map(item => (
                <tr key={item.category} className="border-b border-slate-800/50">
                  <td className="py-2 px-2 text-slate-400">{item.categoryName}</td>
                  <td className="py-2 px-2 text-white text-xs">{item.optionName}</td>
                  <td className="py-2 px-2 text-right font-mono text-white">{item.mass.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-mono text-yellow-400">{item.power.toFixed(1)}</td>
                  <td className="py-2 px-2 text-right font-mono text-green-400">{item.cost > 0 ? `$${item.cost}` : '--'}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-600 font-bold">
                <td className="py-2 px-2 text-white" colSpan={2}>TOTAL</td>
                <td className="py-2 px-2 text-right font-mono text-white">{budget.totalMass.toFixed(2)}</td>
                <td className="py-2 px-2 text-right font-mono text-yellow-400">{budget.totalPower.toFixed(1)}</td>
                <td className="py-2 px-2 text-right font-mono text-green-400">${budget.totalCost.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Warnings */}
      {budget.warnings.length > 0 && (
        <div className="space-y-2">
          {budget.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs bg-yellow-900/20 text-yellow-400 px-3 py-2 rounded-lg">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mission Template Card ──

function MissionTemplateCard({
  template,
  isActive,
  onSelect,
}: {
  template: MissionTemplate;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        isActive
          ? 'border-cyan-500/50 bg-cyan-900/20 shadow-lg shadow-cyan-900/10'
          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-800/50'
      }`}
    >
      <h4 className={`font-semibold text-sm ${isActive ? 'text-cyan-300' : 'text-white'}`}>
        {template.name}
      </h4>
      <div className="flex gap-3 mt-1.5 text-xs text-slate-400">
        <span>{template.orbit}</span>
        <span>|</span>
        <span>{template.altitude}</span>
      </div>
      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{template.description}</p>
    </button>
  );
}

// ── Main Mission Planner Component ──

export default function MissionPlanner() {
  const [selections, setSelections] = useState<SelectedSubsystems>({});
  const [payloadMass, setPayloadMass] = useState(0.5);
  const [payloadPower, setPayloadPower] = useState(5.0);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [showTemplateDetails, setShowTemplateDetails] = useState(false);

  const handleSelectOption = useCallback((categoryId: string, optionId: string) => {
    setSelections(prev => ({ ...prev, [categoryId]: optionId }));
    setActiveTemplate(null);
  }, []);

  const handleLoadTemplate = useCallback((template: MissionTemplate) => {
    setSelections(template.recommendedSubsystems);
    setActiveTemplate(template.id);
  }, []);

  const handleClear = useCallback(() => {
    setSelections({});
    setActiveTemplate(null);
    setPayloadMass(0.5);
    setPayloadPower(5.0);
  }, []);

  const budget = useMemo(
    () => calculateBudget(selections, payloadMass, payloadPower),
    [selections, payloadMass, payloadPower]
  );

  const selectedTemplate = MISSION_TEMPLATES.find(t => t.id === activeTemplate);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Interactive Mission Planner</h2>
        <p className="text-slate-400 text-sm">
          Select subsystems to build a spacecraft configuration. Mass, power, and cost budgets calculate automatically. Start from a mission template or build from scratch.
        </p>
      </div>

      {/* Mission Templates */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Mission Templates</h3>
          {Object.keys(selections).length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1 rounded border border-red-500/30 hover:border-red-500/50"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {MISSION_TEMPLATES.map(template => (
            <MissionTemplateCard
              key={template.id}
              template={template}
              isActive={activeTemplate === template.id}
              onSelect={() => handleLoadTemplate(template)}
            />
          ))}
        </div>

        {/* Template Details */}
        {selectedTemplate && (
          <div className="mt-4">
            <button
              onClick={() => setShowTemplateDetails(!showTemplateDetails)}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              <svg className={`w-4 h-4 transition-transform ${showTemplateDetails ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showTemplateDetails ? 'Hide' : 'Show'} Mission Details
            </button>
            {showTemplateDetails && (
              <div className="mt-3 card p-4 border border-cyan-500/20 bg-slate-800/40">
                <h4 className="font-semibold text-white mb-2">{selectedTemplate.name}</h4>
                <p className="text-sm text-slate-400 mb-3">{selectedTemplate.description}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <div className="bg-slate-900/50 px-3 py-2 rounded">
                    <span className="text-xs text-slate-300 block">Orbit</span>
                    <span className="text-sm font-semibold text-white">{selectedTemplate.orbit}</span>
                  </div>
                  <div className="bg-slate-900/50 px-3 py-2 rounded">
                    <span className="text-xs text-slate-300 block">Altitude</span>
                    <span className="text-sm font-semibold text-white">{selectedTemplate.altitude}</span>
                  </div>
                  <div className="bg-slate-900/50 px-3 py-2 rounded">
                    <span className="text-xs text-slate-300 block">Inclination</span>
                    <span className="text-sm font-semibold text-white">{selectedTemplate.inclination}</span>
                  </div>
                  <div className="bg-slate-900/50 px-3 py-2 rounded">
                    <span className="text-xs text-slate-300 block">Duration</span>
                    <span className="text-sm font-semibold text-white">{selectedTemplate.duration}</span>
                  </div>
                </div>
                <div className="mb-3">
                  <span className="text-xs text-slate-300 font-medium block mb-1.5">Key Requirements</span>
                  <ul className="space-y-1">
                    {selectedTemplate.keyRequirements.map((req, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-cyan-400 flex-shrink-0">--</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-xs text-slate-300 font-medium block mb-1.5">References</span>
                  <div className="space-y-1">
                    {selectedTemplate.references.map((ref, i) => (
                      <a
                        key={i}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {ref.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Two-Column Layout: Subsystem Selectors + Budget */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Subsystem Selection - Left 2/3 */}
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-white">Subsystem Selection</h3>

          {/* Payload Mass/Power Inputs */}
          <div className="card p-4 border border-slate-700/50">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Payload Parameters
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Payload Mass (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={payloadMass}
                  onChange={(e) => setPayloadMass(Math.max(0, parseFloat(e.target.value) || 0))}
                  step={0.1}
                  min={0}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Payload Power (W avg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={payloadPower}
                  onChange={(e) => setPayloadPower(Math.max(0, parseFloat(e.target.value) || 0))}
                  step={0.5}
                  min={0}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Subsystem Category Selectors */}
          {SUBSYSTEM_CATEGORIES.map(category => (
            <div key={category.id} className="card p-4 border border-slate-700/50">
              <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                  {category.abbreviation}
                </span>
                {category.name}
              </h4>
              <p className="text-xs text-slate-500 mb-3">{category.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {category.options.map(option => {
                  const isSelected = selections[category.id] === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(category.id, option.id)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-cyan-500/60 bg-cyan-900/20 ring-1 ring-cyan-500/30'
                          : 'border-slate-700/30 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`text-sm font-medium ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                          {option.name}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          option.trl >= 9 ? 'bg-green-900/30 text-green-400' :
                          option.trl >= 7 ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-orange-900/30 text-orange-400'
                        }`}>
                          TRL {option.trl}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-1.5 text-xs">
                        <span className="text-slate-400">{option.mass.toFixed(2)} kg</span>
                        <span className="text-yellow-400/70">{option.power.toFixed(1)} W</span>
                        <span className="text-green-400/70">{option.cost > 0 ? `$${option.cost}K` : 'Free'}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Budget Summary - Right 1/3, sticky */}
        <div className="xl:col-span-1">
          <div className="sticky top-4">
            <BudgetDisplay budget={budget} />
          </div>
        </div>
      </div>
    </div>
  );
}
