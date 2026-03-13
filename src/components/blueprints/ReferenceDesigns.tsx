'use client';

import { useState } from 'react';
import { CUBESAT_STANDARDS, SMALLSAT_PLATFORMS, SUBSYSTEM_CATEGORIES } from './reference-data';
import type { CubeSatStandard, SmallSatPlatform, SubsystemCategory } from './reference-data';

// ── CubeSat Standard Card ──

function CubeSatCard({ standard }: { standard: CubeSatStandard }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5 border border-slate-700/50 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-white/5 to-blue-500/20 flex items-center justify-center">
            <span className="text-slate-200 font-bold text-lg">{standard.formFactor}</span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">{standard.name}</h3>
            <span className="text-slate-400 text-sm">{standard.dimensions}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-300 block">Max Mass</span>
          <span className="text-lg font-bold text-white">{standard.maxMass} kg</span>
        </div>
      </div>

      <p className="text-slate-400 text-sm mb-4 leading-relaxed">
        {standard.description}
      </p>

      {/* Key Specs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-slate-800/50 px-3 py-2 rounded-lg">
          <span className="text-xs text-slate-300 block">Cost Range</span>
          <span className="text-sm font-semibold text-green-400">
            ${standard.typicalCostMin}K-${standard.typicalCostMax}K
          </span>
        </div>
        <div className="bg-slate-800/50 px-3 py-2 rounded-lg">
          <span className="text-xs text-slate-300 block">Power</span>
          <span className="text-sm font-semibold text-yellow-400">{standard.typicalPower}</span>
        </div>
        <div className="bg-slate-800/50 px-3 py-2 rounded-lg">
          <span className="text-xs text-slate-300 block">Structure Mass</span>
          <span className="text-sm font-semibold text-white">{standard.structureMass} kg</span>
        </div>
        <div className="bg-slate-800/50 px-3 py-2 rounded-lg">
          <span className="text-xs text-slate-300 block">Volume</span>
          <span className="text-sm font-semibold text-white">{standard.availableVolume}</span>
        </div>
      </div>

      {/* Common Missions */}
      <div className="mb-3">
        <span className="text-xs text-slate-300 font-medium block mb-2">Common Missions</span>
        <div className="flex flex-wrap gap-1.5">
          {standard.commonMissions.map((mission, i) => (
            <span key={i} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
              {mission}
            </span>
          ))}
        </div>
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-1 mt-2"
      >
        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {expanded ? 'Hide Details' : 'Show Deployers & References'}
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
          <div>
            <span className="text-xs text-slate-300 font-medium block mb-1.5">Compatible Deployers</span>
            <div className="flex flex-wrap gap-1.5">
              {standard.deployers.map((d, i) => (
                <span key={i} className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">
                  {d}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-300 font-medium block mb-1.5">References</span>
            <div className="space-y-1">
              {standard.references.map((ref, i) => (
                <a
                  key={i}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
}

// ── SmallSat Platform Card ──

function SmallSatCard({ platform }: { platform: SmallSatPlatform }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5 border border-slate-700/50 hover:border-purple-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">{platform.name}</h3>
            <span className="text-slate-400 text-sm">{platform.massRange}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-300 block">Cost Range</span>
          <span className="text-sm font-semibold text-green-400">
            ${(platform.typicalCostMin / 1000).toFixed(0)}M-${(platform.typicalCostMax / 1000).toFixed(0)}M
          </span>
        </div>
      </div>

      <p className="text-slate-400 text-sm mb-4 leading-relaxed">
        {platform.description}
      </p>

      {/* Capabilities */}
      <div className="mb-3">
        <span className="text-xs text-slate-300 font-medium block mb-2">Capabilities</span>
        <ul className="space-y-1">
          {platform.capabilities.slice(0, expanded ? undefined : 3).map((cap, i) => (
            <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
              <span className="text-purple-400 mt-0.5 flex-shrink-0">--</span>
              {cap}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 mt-2"
      >
        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {expanded ? 'Hide Details' : 'Show Examples & References'}
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
          <div>
            <span className="text-xs text-slate-300 font-medium block mb-1.5">Example Missions</span>
            <div className="flex flex-wrap gap-1.5">
              {platform.exampleMissions.map((m, i) => (
                <span key={i} className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
                  {m}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-300 font-medium block mb-1.5">References</span>
            <div className="space-y-1">
              {platform.references.map((ref, i) => (
                <a
                  key={i}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
}

// ── Subsystem Browser ──

function SubsystemBrowser() {
  const [activeCategory, setActiveCategory] = useState<string>(SUBSYSTEM_CATEGORIES[0].id);
  const category = SUBSYSTEM_CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold text-white mb-1">Subsystem Reference Library</h3>
      <p className="text-slate-400 text-sm mb-4">
        Browse available subsystem options by category. Mass, power, and cost estimates are for typical CubeSat/SmallSat-class components.
      </p>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SUBSYSTEM_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-white text-slate-900 shadow-lg shadow-black/15'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {cat.abbreviation}
          </button>
        ))}
      </div>

      {/* Options Table */}
      {category && (
        <div>
          <p className="text-sm text-slate-400 mb-3">{category.description}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Option</th>
                  <th className="text-right py-2 px-3 text-slate-300 font-medium">Mass (kg)</th>
                  <th className="text-right py-2 px-3 text-slate-300 font-medium">Power (W)</th>
                  <th className="text-right py-2 px-3 text-slate-300 font-medium">Cost ($K)</th>
                  <th className="text-center py-2 px-3 text-slate-300 font-medium">TRL</th>
                  <th className="text-left py-2 px-3 text-slate-300 font-medium hidden lg:table-cell">Vendors</th>
                </tr>
              </thead>
              <tbody>
                {category.options.map(opt => (
                  <tr key={opt.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-3">
                      <div className="font-medium text-white">{opt.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 max-w-xs">{opt.description}</div>
                      {opt.referenceUrl && (
                        <a
                          href={opt.referenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-300 hover:text-white mt-1 inline-flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Datasheet
                        </a>
                      )}
                    </td>
                    <td className="text-right py-3 px-3 font-mono text-white">{opt.mass.toFixed(2)}</td>
                    <td className="text-right py-3 px-3 font-mono text-yellow-400">{opt.power.toFixed(1)}</td>
                    <td className="text-right py-3 px-3 font-mono text-green-400">{opt.cost > 0 ? `$${opt.cost}` : '--'}</td>
                    <td className="text-center py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        opt.trl >= 9 ? 'bg-green-900/30 text-green-400' :
                        opt.trl >= 7 ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-orange-900/30 text-orange-400'
                      }`}>
                        TRL {opt.trl}
                      </span>
                    </td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {opt.vendors.slice(0, 3).map((v, i) => (
                          <span key={i} className="text-xs bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">
                            {v}
                          </span>
                        ))}
                        {opt.vendors.length > 3 && (
                          <span className="text-xs text-slate-500">+{opt.vendors.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Reference Designs Tab ──

export default function ReferenceDesigns() {
  return (
    <div className="space-y-10">
      {/* CubeSat Standards */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-1">CubeSat Standards</h2>
        <p className="text-slate-400 text-sm mb-6">
          CubeSat form factors defined by the Cal Poly CubeSat standard. Dimensions, mass limits, and deployer compatibility per the CDS Rev 14.1.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CUBESAT_STANDARDS.map(standard => (
            <CubeSatCard key={standard.id} standard={standard} />
          ))}
        </div>
      </section>

      {/* SmallSat Platforms */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-1">SmallSat Platforms</h2>
        <p className="text-slate-400 text-sm mb-6">
          Spacecraft platforms beyond CubeSat standards, from ESPA-class secondaries to full minisatellites.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {SMALLSAT_PLATFORMS.map(platform => (
            <SmallSatCard key={platform.id} platform={platform} />
          ))}
        </div>
      </section>

      {/* Subsystem Library */}
      <section>
        <SubsystemBrowser />
      </section>
    </div>
  );
}
