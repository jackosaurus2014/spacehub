'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────

type OrbitType = 'leo' | 'meo' | 'meo-nav' | 'geo' | 'lunar' | 'mars';

interface OrbitConfig {
  label: string;
  altitude: string;
  baseDoseRate: number;       // mSv/day behind 10mm Al
  trappedFraction: number;    // fraction of dose from trapped radiation
  gcrFraction: number;        // fraction from GCR
  speFraction: number;        // fraction from SPE (averaged)
  saaFraction: number;        // fraction from SAA (LEO only)
  inclinationEffect: number;  // multiplier per degree from equatorial
  shieldingDecayLength: number; // mm Al for 1/e attenuation
  description: string;
}

const ORBITS: Record<OrbitType, OrbitConfig> = {
  leo: {
    label: 'LEO (ISS)',
    altitude: '400 km',
    baseDoseRate: 0.5,
    trappedFraction: 0.35,
    gcrFraction: 0.25,
    speFraction: 0.10,
    saaFraction: 0.30,
    inclinationEffect: 0.008,
    shieldingDecayLength: 15,
    description: 'Low Earth Orbit at ISS altitude. Protected by Earth\'s magnetosphere but passes through the South Atlantic Anomaly.',
  },
  meo: {
    label: 'MEO (2,000 km)',
    altitude: '2,000 km',
    baseDoseRate: 5.0,
    trappedFraction: 0.80,
    gcrFraction: 0.10,
    speFraction: 0.08,
    saaFraction: 0.02,
    inclinationEffect: 0.003,
    shieldingDecayLength: 12,
    description: 'Inner Van Allen belt. Extremely intense trapped proton and electron radiation. Avoided by most crewed missions.',
  },
  'meo-nav': {
    label: 'MEO-Nav (20,200 km)',
    altitude: '20,200 km',
    baseDoseRate: 2.0,
    trappedFraction: 0.55,
    gcrFraction: 0.25,
    speFraction: 0.18,
    saaFraction: 0.02,
    inclinationEffect: 0.002,
    shieldingDecayLength: 14,
    description: 'GPS/navigation orbit in the outer Van Allen belt. Significant trapped electron radiation.',
  },
  geo: {
    label: 'GEO (35,786 km)',
    altitude: '35,786 km',
    baseDoseRate: 1.5,
    trappedFraction: 0.30,
    gcrFraction: 0.35,
    speFraction: 0.33,
    saaFraction: 0.02,
    inclinationEffect: 0.001,
    shieldingDecayLength: 14,
    description: 'Geostationary orbit. Beyond the outer belt but exposed to solar particle events and GCR.',
  },
  lunar: {
    label: 'Lunar Surface',
    altitude: '384,400 km',
    baseDoseRate: 0.6,
    trappedFraction: 0.0,
    gcrFraction: 0.60,
    speFraction: 0.40,
    saaFraction: 0.0,
    inclinationEffect: 0.0,
    shieldingDecayLength: 18,
    description: 'Lunar surface. No magnetosphere protection. GCR is continuous; SPE events are the primary acute hazard.',
  },
  mars: {
    label: 'Mars Transit',
    altitude: 'Interplanetary',
    baseDoseRate: 1.8,
    trappedFraction: 0.0,
    gcrFraction: 0.55,
    speFraction: 0.45,
    saaFraction: 0.0,
    inclinationEffect: 0.0,
    shieldingDecayLength: 20,
    description: 'Deep space transit to Mars (~6-9 months). Full GCR exposure with no planetary shielding.',
  },
};

interface ShieldingMaterial {
  name: string;
  effectivenessMultiplier: number; // relative to aluminum (1.0)
  density: string;
  notes: string;
}

const SHIELDING_MATERIALS: ShieldingMaterial[] = [
  { name: 'Aluminum', effectivenessMultiplier: 1.0, density: '2.70 g/cm3', notes: 'Baseline spacecraft structural material' },
  { name: 'Polyethylene (HDPE)', effectivenessMultiplier: 1.5, density: '0.97 g/cm3', notes: 'High hydrogen content; excellent for neutron and GCR shielding' },
  { name: 'Water', effectivenessMultiplier: 1.3, density: '1.00 g/cm3', notes: 'Dual-use as consumable and radiation shield' },
  { name: 'Lunar Regolith', effectivenessMultiplier: 0.8, density: '1.50 g/cm3', notes: 'In-situ resource; effective for habitat burial' },
  { name: 'Lead', effectivenessMultiplier: 0.7, density: '11.34 g/cm3', notes: 'Produces secondary radiation (neutrons); poor mass efficiency for space' },
];

interface RadiationEffect {
  range: string;
  dose: string;
  effects: string;
  severity: 'safe' | 'low' | 'moderate' | 'high' | 'critical';
}

const RADIATION_EFFECTS: RadiationEffect[] = [
  { range: '< 100', dose: '0-100 mSv', effects: 'No observable short-term effects. Slight statistical increase in long-term cancer risk.', severity: 'safe' },
  { range: '100-500', dose: '100-500 mSv', effects: 'Slight changes in blood cell counts. Temporary reduction in white blood cells.', severity: 'low' },
  { range: '500-1000', dose: '500-1,000 mSv', effects: 'Nausea, fatigue, and vomiting within hours. Recovery likely with treatment.', severity: 'moderate' },
  { range: '1000-2000', dose: '1,000-2,000 mSv', effects: 'Radiation sickness. Hair loss, hemorrhage, immune suppression. Medical intervention required.', severity: 'high' },
  { range: '> 2000', dose: '> 2,000 mSv', effects: 'Severe radiation sickness. High mortality without intensive medical care. CNS effects above 5,000 mSv.', severity: 'critical' },
];

interface DoseComparison {
  label: string;
  dose: number; // mSv
  color: string;
}

const DOSE_COMPARISONS: DoseComparison[] = [
  { label: 'Earth background (annual)', dose: 2.4, color: 'bg-emerald-500' },
  { label: 'Chest X-ray', dose: 0.1, color: 'bg-emerald-400' },
  { label: 'CT scan (chest)', dose: 10, color: 'bg-yellow-500' },
  { label: 'ISS 6-month mission', dose: 100, color: 'bg-amber-500' },
  { label: 'Mars transit (6 months)', dose: 300, color: 'bg-orange-500' },
  { label: 'NASA career limit', dose: 600, color: 'bg-red-500' },
];

// ────────────────────────────────────────
// Calculation Functions
// ────────────────────────────────────────

function calculateShieldingFactor(thicknessMm: number, decayLength: number): number {
  // Exponential attenuation: dose * exp(-thickness / decayLength)
  return Math.exp(-thicknessMm / decayLength);
}

function calculateDose(
  orbit: OrbitConfig,
  durationDays: number,
  inclination: number,
  shieldingMm: number,
): {
  totalDose: number;
  annualRate: number;
  trappedDose: number;
  gcrDose: number;
  speDose: number;
  saaDose: number;
  shieldingEffectiveness: number;
  unshieldedDose: number;
} {
  // Inclination effect on dose (higher inclination = more SAA passes in LEO)
  const inclinationMultiplier = 1 + orbit.inclinationEffect * inclination;

  // Unshielded dose rate
  const unshieldedRate = orbit.baseDoseRate * inclinationMultiplier;

  // Shielding attenuation
  const shieldingFactor = calculateShieldingFactor(shieldingMm, orbit.shieldingDecayLength);

  // Effective dose rate with shielding
  const effectiveRate = unshieldedRate * shieldingFactor;

  // Total mission dose
  const totalDose = effectiveRate * durationDays;
  const unshieldedDose = unshieldedRate * durationDays;

  // Annual rate
  const annualRate = effectiveRate * 365.25;

  // Breakdown by source
  const trappedDose = totalDose * orbit.trappedFraction;
  const gcrDose = totalDose * orbit.gcrFraction;
  const speDose = totalDose * orbit.speFraction;
  const saaDose = totalDose * orbit.saaFraction;

  // Shielding effectiveness percentage
  const shieldingEffectiveness = (1 - shieldingFactor) * 100;

  return {
    totalDose,
    annualRate,
    trappedDose,
    gcrDose,
    speDose,
    saaDose,
    shieldingEffectiveness,
    unshieldedDose,
  };
}

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

function ResultCard({ label, value, unit, accent = 'cyan' }: {
  label: string;
  value: string;
  unit?: string;
  accent?: 'cyan' | 'purple' | 'emerald' | 'amber' | 'red';
}) {
  const colors = {
    cyan: 'text-white/70',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };
  return (
    <div className="card p-4 text-center">
      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold ${colors[accent]}`}>{value}</div>
      {unit && <div className="text-xs text-slate-500 mt-0.5">{unit}</div>}
    </div>
  );
}

function DoseBar({ label, dose, maxDose, color, isCalculated = false }: {
  label: string;
  dose: number;
  maxDose: number;
  color: string;
  isCalculated?: boolean;
}) {
  const width = Math.max(Math.min((dose / maxDose) * 100, 100), 0.5);
  return (
    <div className={`mb-3 ${isCalculated ? 'ring-1 ring-white/10 rounded-lg p-2 bg-white/5' : ''}`}>
      <div className="flex justify-between text-xs mb-1">
        <span className={`${isCalculated ? 'text-white/90 font-semibold' : 'text-white/70'}`}>
          {label}
          {isCalculated && <span className="ml-2 text-[10px] uppercase tracking-wider text-white/70/70">(Your Mission)</span>}
        </span>
        <span className="text-slate-400">{dose < 1 ? dose.toFixed(2) : dose.toFixed(1)} mSv</span>
      </div>
      <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${isCalculated ? 'bg-gradient-to-r from-white to-slate-400' : color}`}
          style={{ width: `${width}%` }}
        />

        <RelatedModules modules={PAGE_RELATIONS['radiation-calculator']} />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: RadiationEffect['severity'] }) {
  const styles = {
    safe: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    low: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    moderate: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold border ${styles[severity]}`}>
      {severity}
    </span>
  );
}

// ────────────────────────────────────────
// Orbit Selection Panel
// ────────────────────────────────────────

function OrbitSelectionPanel({
  selectedOrbit,
  onOrbitChange,
  inclination,
  onInclinationChange,
  duration,
  onDurationChange,
  shielding,
  onShieldingChange,
}: {
  selectedOrbit: OrbitType;
  onOrbitChange: (o: OrbitType) => void;
  inclination: number;
  onInclinationChange: (v: number) => void;
  duration: number;
  onDurationChange: (v: number) => void;
  shielding: number;
  onShieldingChange: (v: number) => void;
}) {
  const orbitConfig = ORBITS[selectedOrbit];
  const isEarthOrbit = selectedOrbit !== 'lunar' && selectedOrbit !== 'mars';

  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
        Orbit Selection
      </h3>

      {/* Orbit Type Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
        {(Object.keys(ORBITS) as OrbitType[]).map((key) => (
          <button
            key={key}
            onClick={() => onOrbitChange(key)}
            className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border text-left ${
              selectedOrbit === key
                ? 'bg-white/8 border-white/15 text-white/70'
                : 'bg-slate-900/50 border-white/[0.06] text-slate-400 hover:border-slate-600/50 hover:text-white/70'
            }`}
          >
            <div className="text-xs font-semibold">{ORBITS[key].label}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{ORBITS[key].altitude}</div>
          </button>
        ))}
      </div>

      {/* Orbit Description */}
      <div className="card p-3 bg-white/[0.03] mb-5">
        <p className="text-xs text-slate-400 leading-relaxed">{orbitConfig.description}</p>
        <div className="mt-2 text-xs text-slate-500">
          Base dose rate: <span className="text-white/70 font-medium">{orbitConfig.baseDoseRate} mSv/day</span> (behind 10mm Al)
        </div>
      </div>

      {/* Inclination Slider */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-white/70 mb-1.5">
          Orbital Inclination
          {!isEarthOrbit && <span className="text-xs text-slate-500 ml-2">(not applicable)</span>}
        </label>
        <div className="flex items-center gap-3 mb-1.5">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={90}
            step={0.1}
            value={inclination}
            disabled={!isEarthOrbit}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0 && val <= 90) onInclinationChange(val);
            }}
            className="w-24 bg-slate-900/70 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-slate-400">degrees</span>
        </div>
        <input
          type="range"
          min={0}
          max={90}
          step={0.5}
          value={inclination}
          disabled={!isEarthOrbit}
          onChange={(e) => onInclinationChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-slate-400 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer disabled:opacity-40"
        />
        <p className="text-xs text-slate-500 mt-1">
          ISS: 51.6 deg | Sun-sync: ~98 deg | Higher inclination increases SAA exposure in LEO
        </p>
      </div>

      {/* Mission Duration */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-white/70 mb-1.5">Mission Duration</label>
        <div className="flex items-center gap-3 mb-1.5">
          <input
            type="number"
            inputMode="decimal"
            min={1}
            max={1095}
            step={1}
            value={duration}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= 1095) onDurationChange(val);
            }}
            className="w-24 bg-slate-900/70 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10"
          />
          <span className="text-sm text-slate-400">days</span>
          <span className="text-xs text-slate-500">({(duration / 30.44).toFixed(1)} months)</span>
        </div>
        <input
          type="range"
          min={1}
          max={1095}
          step={1}
          value={duration}
          onChange={(e) => onDurationChange(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-slate-400 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>1 day</span>
          <span>6 months (ISS)</span>
          <span>1 year</span>
          <span>3 years (Mars)</span>
        </div>
      </div>

      {/* Shielding Thickness */}
      <div className="mb-2">
        <label className="block text-sm font-medium text-white/70 mb-1.5">Shielding Thickness (Al equivalent)</label>
        <div className="flex items-center gap-3 mb-1.5">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={50}
            step={0.5}
            value={shielding}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0 && val <= 50) onShieldingChange(val);
            }}
            className="w-24 bg-slate-900/70 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10"
          />
          <span className="text-sm text-slate-400">mm Al</span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={0.5}
          value={shielding}
          onChange={(e) => onShieldingChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-slate-400 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>0 mm (EVA suit)</span>
          <span>10 mm (ISS avg)</span>
          <span>30 mm (heavy)</span>
          <span>50 mm</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Radiation Sources Panel
// ────────────────────────────────────────

function RadiationSourcesPanel({ orbit, results }: {
  orbit: OrbitConfig;
  results: ReturnType<typeof calculateDose>;
}) {
  const sources = [
    {
      name: 'Trapped Radiation (Van Allen Belts)',
      fraction: orbit.trappedFraction,
      dose: results.trappedDose,
      color: 'text-purple-400',
      barColor: 'bg-purple-500',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      description: 'Energetic protons and electrons trapped by Earth\'s magnetic field. Highest in MEO through the inner and outer belts.',
    },
    {
      name: 'Galactic Cosmic Rays (GCR)',
      fraction: orbit.gcrFraction,
      dose: results.gcrDose,
      color: 'text-white/70',
      barColor: 'bg-white',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
      description: 'High-energy ions from outside the solar system. Constant, low-flux background. Dominant beyond Earth\'s magnetosphere.',
    },
    {
      name: 'Solar Particle Events (SPE)',
      fraction: orbit.speFraction,
      dose: results.speDose,
      color: 'text-amber-400',
      barColor: 'bg-amber-500',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ),
      description: 'Episodic bursts from solar flares and coronal mass ejections. Can deliver weeks of normal dose in hours.',
    },
    {
      name: 'South Atlantic Anomaly (SAA)',
      fraction: orbit.saaFraction,
      dose: results.saaDose,
      color: 'text-emerald-400',
      barColor: 'bg-emerald-500',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
      description: 'Region over South America where the inner Van Allen belt dips closest to Earth. Primary contributor to LEO crew dose.',
    },
  ];

  const maxDose = Math.max(results.trappedDose, results.gcrDose, results.speDose, results.saaDose, 0.01);

  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        Radiation Sources
      </h3>

      <div className="space-y-4">
        {sources.map((source) => (
          <div key={source.name} className="card p-3 bg-white/[0.03]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={source.color}>{source.icon}</span>
              <span className="text-sm font-medium text-white/90">{source.name}</span>
              <span className={`text-xs ${source.color} ml-auto font-semibold`}>
                {(source.fraction * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${source.barColor}`}
                style={{ width: `${Math.max((source.dose / maxDose) * 100, 1)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">{source.description}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">
              Contribution: {source.dose.toFixed(2)} mSv
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Calculated Results Panel
// ────────────────────────────────────────

function CalculatedResultsPanel({ results, duration }: {
  results: ReturnType<typeof calculateDose>;
  duration: number;
}) {
  const nasaCareerLimit = 600; // mSv
  const issAnnualLow = 150;
  const issAnnualHigh = 200;
  const earthBackground = 2.4;

  const careerPercent = (results.totalDose / nasaCareerLimit) * 100;
  const issComparison = results.annualRate / ((issAnnualLow + issAnnualHigh) / 2) * 100;

  let doseLevel: 'safe' | 'elevated' | 'high' | 'critical';
  if (results.totalDose < 100) doseLevel = 'safe';
  else if (results.totalDose < 500) doseLevel = 'elevated';
  else if (results.totalDose < 1000) doseLevel = 'high';
  else doseLevel = 'critical';

  const levelColors = {
    safe: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
    elevated: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
    high: 'text-orange-400 border-orange-500/30 bg-orange-500/5',
    critical: 'text-red-400 border-red-500/30 bg-red-500/5',
  };

  const levelLabels = {
    safe: 'Within Safe Limits',
    elevated: 'Elevated Exposure',
    high: 'High Exposure',
    critical: 'Critical Exposure',
  };

  return (
    <div className="space-y-4">
      {/* Top Result Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ResultCard
          label="Total Mission Dose"
          value={results.totalDose < 1 ? results.totalDose.toFixed(3) : results.totalDose.toFixed(1)}
          unit="mSv"
          accent="cyan"
        />
        <ResultCard
          label="Annual Dose Rate"
          value={results.annualRate < 1 ? results.annualRate.toFixed(3) : results.annualRate.toFixed(1)}
          unit="mSv/year"
          accent="purple"
        />
        <ResultCard
          label="Shielding Effectiveness"
          value={results.shieldingEffectiveness.toFixed(1)}
          unit="% dose reduction"
          accent="emerald"
        />
        <ResultCard
          label="Unshielded Dose"
          value={results.unshieldedDose < 1 ? results.unshieldedDose.toFixed(3) : results.unshieldedDose.toFixed(1)}
          unit="mSv"
          accent="amber"
        />
      </div>

      {/* Status Banner */}
      <div className={`card p-4 border ${levelColors[doseLevel]}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            doseLevel === 'safe' ? 'bg-emerald-400' :
            doseLevel === 'elevated' ? 'bg-amber-400' :
            doseLevel === 'high' ? 'bg-orange-400' : 'bg-red-400'
          } animate-pulse`} />
          <span className="font-semibold text-sm">{levelLabels[doseLevel]}</span>
        </div>
      </div>

      {/* Comparison Metrics */}
      <div className="card p-5">
        <h4 className="text-sm font-semibold text-white/90 mb-4">Exposure Comparisons</h4>
        <div className="space-y-3">
          {/* NASA Career Limit */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/70">NASA Career Limit (600 mSv)</span>
              <span className={`font-semibold ${careerPercent > 100 ? 'text-red-400' : careerPercent > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {careerPercent.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  careerPercent > 100 ? 'bg-red-500' : careerPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(careerPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* ISS Comparison */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/70">vs. ISS Annual Rate ({issAnnualLow}-{issAnnualHigh} mSv/yr)</span>
              <span className="text-slate-400 font-medium">{issComparison.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-purple-500"
                style={{ width: `${Math.min(issComparison, 100)}%` }}
              />
            </div>
          </div>

          {/* Earth Background */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/70">vs. Earth Background ({earthBackground} mSv/yr)</span>
              <span className="text-slate-400 font-medium">{(results.annualRate / earthBackground).toFixed(1)}x</span>
            </div>
            <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-white"
                style={{ width: `${Math.min((results.annualRate / earthBackground) * 5, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-white/[0.03] rounded-lg">
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="text-slate-400 font-medium">Note:</span> NASA limits vary by age and gender.
            The 600 mSv career limit represents the approximate upper bound. NCRP recommendations
            set a 3% excess lifetime cancer mortality risk as the threshold, which translates to
            different dose limits depending on individual factors. ISS crew typically receive
            150-200 mSv/year, well within career limits for most astronauts.
          </p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Visual Dose Comparison Chart
// ────────────────────────────────────────

function DoseComparisonChart({ calculatedDose }: { calculatedDose: number }) {
  const allDoses = [...DOSE_COMPARISONS, {
    label: 'Your calculated mission',
    dose: calculatedDose,
    color: 'bg-white',
  }].sort((a, b) => a.dose - b.dose);

  const maxDose = Math.max(...allDoses.map(d => d.dose), 1);

  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        Dose Comparison Chart
      </h3>
      <div className="space-y-1">
        {allDoses.map((item) => (
          <DoseBar
            key={item.label}
            label={item.label}
            dose={item.dose}
            maxDose={maxDose}
            color={item.color}
            isCalculated={item.label === 'Your calculated mission'}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-600 mt-3">
        Logarithmic scale would be more appropriate for the full range; bars shown proportionally to max value.
      </p>
    </div>
  );
}

// ────────────────────────────────────────
// Radiation Effects Table
// ────────────────────────────────────────

function RadiationEffectsTable({ currentDose }: { currentDose: number }) {
  function isCurrentRange(effect: RadiationEffect): boolean {
    if (effect.range === '< 100') return currentDose < 100;
    if (effect.range === '100-500') return currentDose >= 100 && currentDose < 500;
    if (effect.range === '500-1000') return currentDose >= 500 && currentDose < 1000;
    if (effect.range === '1000-2000') return currentDose >= 1000 && currentDose < 2000;
    if (effect.range === '> 2000') return currentDose >= 2000;
    return false;
  }

  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.174 1.287-5.976L2.13 7.724l6.096-.506L11.42 2l3.194 5.218 6.096.506-4.193 4.644 1.287 5.976z" />
        </svg>
        Radiation Effects on Humans
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">Dose Range</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">Severity</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">Effects</th>
            </tr>
          </thead>
          <tbody>
            {RADIATION_EFFECTS.map((effect) => {
              const isCurrent = isCurrentRange(effect);
              return (
                <tr
                  key={effect.range}
                  className={`border-b border-white/[0.04] ${
                    isCurrent ? 'bg-white/5 ring-1 ring-inset ring-white/15' : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <span className={`text-sm font-medium ${isCurrent ? 'text-white/90' : 'text-white/90'}`}>
                      {effect.dose}
                    </span>
                    {isCurrent && (
                      <div className="text-[10px] text-white/70 mt-0.5 uppercase tracking-wider font-semibold">
                        Your mission
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <SeverityBadge severity={effect.severity} />
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-400 leading-relaxed">{effect.effects}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Shielding Materials Comparison
// ────────────────────────────────────────

function ShieldingMaterialsPanel({ shieldingMm, orbitDecayLength }: {
  shieldingMm: number;
  orbitDecayLength: number;
}) {
  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        Shielding Materials Comparison
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Effectiveness at {shieldingMm} mm thickness (aluminum equivalent). Materials with higher hydrogen
        content are more effective at stopping charged particles per unit mass.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">Material</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">Mass Eff.</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">Density</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">Dose Reduction</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody>
            {SHIELDING_MATERIALS.map((material) => {
              const effectiveThickness = shieldingMm * material.effectivenessMultiplier;
              const reduction = (1 - Math.exp(-effectiveThickness / orbitDecayLength)) * 100;
              const isBaseline = material.effectivenessMultiplier === 1.0;
              return (
                <tr
                  key={material.name}
                  className={`border-b border-white/[0.04] ${isBaseline ? 'bg-slate-800/20' : ''}`}
                >
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-white/90">{material.name}</span>
                    {isBaseline && <span className="text-[10px] text-slate-500 ml-1.5">(baseline)</span>}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-sm font-semibold ${
                      material.effectivenessMultiplier > 1 ? 'text-emerald-400' :
                      material.effectivenessMultiplier < 1 ? 'text-red-400' : 'text-white/70'
                    }`}>
                      {material.effectivenessMultiplier.toFixed(1)}x
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-400">{material.density}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            reduction > 60 ? 'bg-emerald-500' : reduction > 30 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(reduction, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/70 font-medium">{reduction.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-500">{material.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function RadiationCalculatorPage() {
  const [selectedOrbit, setSelectedOrbit] = useState<OrbitType>('leo');
  const [inclination, setInclination] = useState(51.6);
  const [duration, setDuration] = useState(180);
  const [shielding, setShielding] = useState(10);

  const orbitConfig = ORBITS[selectedOrbit];

  const results = useMemo(
    () => calculateDose(orbitConfig, duration, inclination, shielding),
    [orbitConfig, duration, inclination, shielding],
  );

  const handleOrbitChange = useCallback((orbit: OrbitType) => {
    setSelectedOrbit(orbit);
    // Reset inclination for non-Earth orbits
    if (orbit === 'lunar' || orbit === 'mars') {
      setInclination(0);
    } else if (orbit === 'leo') {
      setInclination(51.6);
    } else {
      setInclination(0);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="container mx-auto px-4 max-w-7xl">

        <AnimatedPageHeader
          title="Space Radiation Environment Calculator"
          subtitle="Calculate radiation exposure for spacecraft and astronauts across different orbits, with shielding analysis and biological effects"
          accentColor="cyan"
        />

        {/* Main Layout: Two Column */}
        <ScrollReveal>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left: Input Controls */}
          <div className="lg:col-span-1 space-y-6">
            <OrbitSelectionPanel
              selectedOrbit={selectedOrbit}
              onOrbitChange={handleOrbitChange}
              inclination={inclination}
              onInclinationChange={setInclination}
              duration={duration}
              onDurationChange={setDuration}
              shielding={shielding}
              onShieldingChange={setShielding}
            />

            <RadiationSourcesPanel orbit={orbitConfig} results={results} />
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2 space-y-6">
            <CalculatedResultsPanel results={results} duration={duration} />
            <DoseComparisonChart calculatedDose={results.totalDose} />
          </div>
        </div>

        </ScrollReveal>

        {/* Full Width Sections */}
        <ScrollReveal delay={0.1}>
        <div className="space-y-6 mb-8">
          <RadiationEffectsTable currentDose={results.totalDose} />
          <ShieldingMaterialsPanel shieldingMm={shielding} orbitDecayLength={orbitConfig.shieldingDecayLength} />
        </div>

        </ScrollReveal>

        {/* Methodology & Notes */}
        <ScrollReveal delay={0.2}>
        <div className="card p-5 mb-8">
          <h3 className="text-lg font-semibold text-slate-100 mb-3">Methodology & Limitations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-500 leading-relaxed">
            <div>
              <h4 className="text-sm font-medium text-white/70 mb-2">Dose Model</h4>
              <p className="mb-2">
                This calculator uses simplified dose rate models based on published measurements from
                ISS crew dosimeters, the RAD instrument on MSL/Curiosity, and AP-8/AE-8 trapped particle
                models. Base dose rates assume 10mm aluminum shielding at solar minimum conditions.
              </p>
              <p>
                Shielding attenuation follows an exponential model: Dose = D0 * exp(-t/L), where t is
                shielding thickness in mm Al equivalent and L is the characteristic attenuation length
                (~12-20 mm depending on the radiation environment and particle energies).
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white/70 mb-2">Important Caveats</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Solar cycle effects are not modeled (GCR is ~2x higher at solar minimum)</li>
                <li>SPE dose is averaged; individual events can deliver 100+ mSv in hours</li>
                <li>Organ dose varies significantly from whole-body average (skin vs. bone marrow)</li>
                <li>Secondary radiation (neutrons, fragments) from shielding is not modeled</li>
                <li>Actual shielding geometry is complex and varies by spacecraft compartment</li>
                <li>For mission planning, use NASA OLTARIS, SPENVIS, or CREME96 models</li>
              </ul>
            </div>
          </div>
        </div>

        </ScrollReveal>

        {/* Related Tools */}
        <ScrollReveal delay={0.1}>
        <div className="card p-5 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Related Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/orbital-calculator"
              className="p-3 rounded-lg bg-slate-700/30 hover:bg-white/[0.08] transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-white/90">
                Orbital Mechanics Calculator
              </div>
              <p className="text-xs text-slate-400 mt-1">Delta-V, periods, decay analysis</p>
            </Link>
            <Link
              href="/space-environment"
              className="p-3 rounded-lg bg-slate-700/30 hover:bg-white/[0.08] transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-white/90">
                Space Environment
              </div>
              <p className="text-xs text-slate-400 mt-1">Solar weather, debris tracking</p>
            </Link>
            <Link
              href="/mars-planner"
              className="p-3 rounded-lg bg-slate-700/30 hover:bg-white/[0.08] transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-white/90">
                Mars Mission Planner
              </div>
              <p className="text-xs text-slate-400 mt-1">Plan interplanetary missions</p>
            </Link>
            <Link
              href="/materials-database"
              className="p-3 rounded-lg bg-slate-700/30 hover:bg-white/[0.08] transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-white/90">
                Materials Database
              </div>
              <p className="text-xs text-slate-400 mt-1">Spacecraft materials & properties</p>
            </Link>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
