'use client';

import { useState, useEffect, useMemo } from 'react';
import DataAsOf from '@/components/ui/DataAsOf';

// Ported from the retired /blueprints module (2026-08-14). Blueprints'
// "engine" tab duplicated this database, but its satellite bus and lunar
// lander specs did not — they're DB-backed (src/lib/blueprint-data.ts via
// /api/blueprints) and non-duplicate, so they live here as a sub-tab.

type SpacecraftCategory = 'satellite_bus' | 'lander';

interface SpacecraftSpecs {
  dryMass?: number;
  maxPayloadMass?: number;
  power?: number;
  designLife?: number;
  propulsion?: string;
  attitude?: string;
  dimensions?: string;
  landingMass?: number;
  payloadCapacity?: number;
  landingAccuracy?: string;
  surfaceOperations?: string;
}

interface SpacecraftEntry {
  id: string;
  name: string;
  category: SpacecraftCategory;
  manufacturer: string;
  specifications: SpacecraftSpecs;
  propellantType?: string;
  firstFlight?: string;
  missionsFlown?: number;
  keyInnovations: string[];
  description: string;
  status: 'operational' | 'development' | 'retired' | 'proposed';
}

const STATUS_STYLES: Record<SpacecraftEntry['status'], { label: string; color: string; bg: string }> = {
  operational: { label: 'Operational', color: 'text-emerald-400', bg: 'bg-emerald-900/20' },
  development: { label: 'In Development', color: 'text-amber-400', bg: 'bg-amber-900/20' },
  retired: { label: 'Retired', color: 'text-slate-400', bg: 'bg-white/[0.04]' },
  proposed: { label: 'Proposed', color: 'text-blue-400', bg: 'bg-blue-900/20' },
};

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return '-';
  return n.toLocaleString();
}

function SpacecraftCard({ entry }: { entry: SpacecraftEntry }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_STYLES[entry.status];
  const specs = entry.specifications;

  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl overflow-hidden hover:border-slate-600/70 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 flex items-center gap-4"
      >
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${statusStyle.bg} ${statusStyle.color} border-current/30`}>
          {entry.category === 'satellite_bus' ? 'Satellite Bus' : 'Lunar Lander'}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-100 truncate">{entry.name}</h3>
          <p className="text-sm text-slate-400 truncate">{entry.manufacturer}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <span className={`w-2 h-2 rounded-full ${statusStyle.color.replace('text-', 'bg-')}`} />
          <span className={`text-xs ${statusStyle.color}`}>{statusStyle.label}</span>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] px-5 py-4 bg-white/[0.03]">
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">{entry.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {entry.category === 'satellite_bus' && (
              <>
                {specs.power != null && (
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Power</div>
                    <div className="text-lg font-mono text-blue-400">{formatNumber(specs.power)} W</div>
                  </div>
                )}
                {specs.designLife != null && (
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Design Life</div>
                    <div className="text-lg font-mono text-white/70">{specs.designLife} yrs</div>
                  </div>
                )}
                {specs.dryMass != null && (
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dry Mass</div>
                    <div className="text-lg font-mono text-orange-400">{formatNumber(specs.dryMass)} kg</div>
                  </div>
                )}
                {specs.maxPayloadMass != null && (
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Max Payload</div>
                    <div className="text-lg font-mono text-orange-400">{formatNumber(specs.maxPayloadMass)} kg</div>
                  </div>
                )}
                {specs.propulsion && (
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Propulsion</div>
                    <div className="text-sm text-white/90">{specs.propulsion}</div>
                  </div>
                )}
                {specs.dimensions && (
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dimensions</div>
                    <div className="text-sm text-white/90">{specs.dimensions}</div>
                  </div>
                )}
              </>
            )}
            {entry.category === 'lander' && (
              <>
                {specs.landingMass != null && (
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Landing Mass</div>
                    <div className="text-lg font-mono text-orange-400">{formatNumber(specs.landingMass)} kg</div>
                  </div>
                )}
                {specs.payloadCapacity != null && (
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Payload Capacity</div>
                    <div className="text-lg font-mono text-orange-400">{formatNumber(specs.payloadCapacity)} kg</div>
                  </div>
                )}
                {entry.propellantType && (
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Propellant</div>
                    <div className="text-sm text-white/90">{entry.propellantType}</div>
                  </div>
                )}
                {specs.landingAccuracy && (
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Landing Accuracy</div>
                    <div className="text-sm text-white/90">{specs.landingAccuracy}</div>
                  </div>
                )}
                {specs.surfaceOperations && (
                  <div className="bg-slate-900/50 rounded-lg p-3 col-span-2">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Surface Operations</div>
                    <div className="text-sm text-white/90">{specs.surfaceOperations}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {entry.keyInnovations?.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Key Innovations</div>
              <ul className="space-y-1">
                {entry.keyInnovations.map((innovation, i) => (
                  <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">&bull;</span>
                    {innovation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-white/[0.06]">
            {entry.firstFlight && <span>First flight: {new Date(entry.firstFlight).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>}
            {!!entry.missionsFlown && <span>{formatNumber(entry.missionsFlown)} missions flown</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SpacecraftTab() {
  const [category, setCategory] = useState<SpacecraftCategory>('satellite_bus');
  const [entries, setEntries] = useState<SpacecraftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/blueprints?category=${category}&limit=100`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.error) {
          setError('Failed to load spacecraft data.');
        } else {
          setEntries(data.blueprints || []);
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load spacecraft data.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category]);

  const sorted = useMemo(() => [...entries].sort((a, b) => a.name.localeCompare(b.name)), [entries]);

  return (
    <div>
      <DataAsOf date="February 2026" note="satellite bus and lunar lander specifications, ported from the retired Blueprint Series module" className="mb-4" />

      <div className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-4 mb-6 flex flex-wrap gap-3">
        {([
          { id: 'satellite_bus' as const, label: 'Satellite Buses' },
          { id: 'lander' as const, label: 'Lunar Landers' },
        ]).map(opt => (
          <button
            key={opt.id}
            onClick={() => setCategory(opt.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
              category === opt.id
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:border-white/[0.1]'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-400 self-center">{sorted.length} systems</span>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center text-red-400 text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading spacecraft data&hellip;</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">No {category === 'satellite_bus' ? 'satellite bus' : 'lunar lander'} entries available.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(entry => (
            <SpacecraftCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
