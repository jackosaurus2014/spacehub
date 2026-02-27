'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Constants & Types
// ────────────────────────────────────────

const SOLAR_CONSTANT = 1361; // W/m²

type OrbitType = 'leo-sunsync' | 'leo-inclined' | 'geo' | 'meo';

interface OrbitData {
  label: string;
  eclipseFraction: number;   // fraction of orbit in eclipse
  sunAngleDeg: number;       // effective average sun incidence angle
  periodMinutes: number;     // orbital period in minutes
  description: string;
}

const ORBIT_DATA: Record<OrbitType, OrbitData> = {
  'leo-sunsync': {
    label: 'LEO Sun-Synchronous',
    eclipseFraction: 0.35,
    sunAngleDeg: 23,
    periodMinutes: 97,
    description: '~500-800 km, dawn-dusk or noon-midnight',
  },
  'leo-inclined': {
    label: 'LEO Inclined',
    eclipseFraction: 0.37,
    sunAngleDeg: 35,
    periodMinutes: 92,
    description: '~400-600 km, ISS-type orbit (51.6 deg)',
  },
  geo: {
    label: 'Geostationary (GEO)',
    eclipseFraction: 0.01,
    sunAngleDeg: 23,
    periodMinutes: 1436,
    description: '35,786 km equatorial, ~1% eclipse near equinox',
  },
  meo: {
    label: 'Medium Earth Orbit (MEO)',
    eclipseFraction: 0.08,
    sunAngleDeg: 25,
    periodMinutes: 720,
    description: '~20,000 km, GPS/navigation constellation',
  },
};

interface Subsystem {
  id: string;
  name: string;
  power: number;        // watts
  dutyCycle: number;     // 0-100 percent
  maxPower: number;
}

const DEFAULT_SUBSYSTEMS: Subsystem[] = [
  { id: 'payload',    name: 'Payload (imaging/comms)',      power: 50,  dutyCycle: 60,  maxPower: 2000 },
  { id: 'adcs',       name: 'Attitude Control (ADCS)',      power: 15,  dutyCycle: 100, maxPower: 200 },
  { id: 'thermal',    name: 'Thermal Control (heaters)',    power: 10,  dutyCycle: 50,  maxPower: 300 },
  { id: 'comms',      name: 'Communications (TT&C)',        power: 25,  dutyCycle: 30,  maxPower: 500 },
  { id: 'obc',        name: 'On-Board Computer',            power: 10,  dutyCycle: 100, maxPower: 100 },
  { id: 'propulsion', name: 'Propulsion (if electric)',     power: 0,   dutyCycle: 5,   maxPower: 3000 },
  { id: 'other',      name: 'Other / Margin',               power: 5,   dutyCycle: 100, maxPower: 500 },
];

interface Preset {
  label: string;
  description: string;
  orbit: OrbitType;
  panelArea: number;
  panelEfficiency: number;
  batteryCapacity: number;
  dod: number;
  subsystems: Pick<Subsystem, 'id' | 'power' | 'dutyCycle'>[];
}

const PRESETS: Preset[] = [
  {
    label: 'CubeSat 3U',
    description: '3U CubeSat with body-mounted panels',
    orbit: 'leo-sunsync',
    panelArea: 0.06,
    panelEfficiency: 28,
    batteryCapacity: 20,
    dod: 30,
    subsystems: [
      { id: 'payload', power: 3, dutyCycle: 40 },
      { id: 'adcs', power: 1.5, dutyCycle: 100 },
      { id: 'thermal', power: 0.5, dutyCycle: 30 },
      { id: 'comms', power: 2, dutyCycle: 20 },
      { id: 'obc', power: 1, dutyCycle: 100 },
      { id: 'propulsion', power: 0, dutyCycle: 0 },
      { id: 'other', power: 0.5, dutyCycle: 100 },
    ],
  },
  {
    label: 'SmallSat 100kg',
    description: '100 kg class with deployable panels',
    orbit: 'leo-sunsync',
    panelArea: 1.5,
    panelEfficiency: 30,
    batteryCapacity: 100,
    dod: 40,
    subsystems: [
      { id: 'payload', power: 80, dutyCycle: 50 },
      { id: 'adcs', power: 20, dutyCycle: 100 },
      { id: 'thermal', power: 15, dutyCycle: 50 },
      { id: 'comms', power: 40, dutyCycle: 30 },
      { id: 'obc', power: 15, dutyCycle: 100 },
      { id: 'propulsion', power: 50, dutyCycle: 5 },
      { id: 'other', power: 10, dutyCycle: 100 },
    ],
  },
  {
    label: 'Large GEO Comms',
    description: 'Full-size GEO communications satellite',
    orbit: 'geo',
    panelArea: 15,
    panelEfficiency: 32,
    batteryCapacity: 2000,
    dod: 60,
    subsystems: [
      { id: 'payload', power: 3500, dutyCycle: 100 },
      { id: 'adcs', power: 100, dutyCycle: 100 },
      { id: 'thermal', power: 200, dutyCycle: 80 },
      { id: 'comms', power: 150, dutyCycle: 100 },
      { id: 'obc', power: 50, dutyCycle: 100 },
      { id: 'propulsion', power: 500, dutyCycle: 2 },
      { id: 'other', power: 100, dutyCycle: 100 },
    ],
  },
];

// ────────────────────────────────────────
// Helper Components
// ────────────────────────────────────────

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  description,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  description?: string;
}) {
  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(parseFloat(e.target.value).toFixed(6)));
  }, [onChange]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= min && val <= max) {
      onChange(val);
    }
  }, [min, max, onChange]);

  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <div className="flex items-center gap-3 mb-1">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInput}
          className="w-24 bg-slate-900/70 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
        />
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSlider}
        className="w-full h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-amber-500 [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
      />
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
  );
}

function ResultCard({ label, value, unit, accent = 'amber', highlight }: {
  label: string;
  value: string;
  unit?: string;
  accent?: 'amber' | 'cyan' | 'emerald' | 'red' | 'purple';
  highlight?: 'positive' | 'negative' | 'neutral';
}) {
  const colors = {
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  };
  const highlightBg = highlight === 'positive'
    ? 'border-emerald-500/30 bg-emerald-500/5'
    : highlight === 'negative'
      ? 'border-red-500/30 bg-red-500/5'
      : '';

  return (
    <div className={`card p-4 text-center ${highlightBg}`}>
      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold ${colors[accent]}`}>{value}</div>
      {unit && <div className="text-xs text-slate-500 mt-0.5">{unit}</div>}
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function PowerBudgetCalculatorPage() {
  // Solar Panel State
  const [orbitType, setOrbitType] = useState<OrbitType>('leo-sunsync');
  const [panelArea, setPanelArea] = useState(1.5);
  const [panelEfficiency, setPanelEfficiency] = useState(30);

  // Load Profile State
  const [subsystems, setSubsystems] = useState<Subsystem[]>(DEFAULT_SUBSYSTEMS);

  // Battery State
  const [batteryCapacity, setBatteryCapacity] = useState(100);
  const [dod, setDod] = useState(40);
  const [missionLifeYears, setMissionLifeYears] = useState(5);

  // ── Subsystem Handlers ──
  const updateSubsystem = useCallback((id: string, field: 'power' | 'dutyCycle', value: number) => {
    setSubsystems(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  }, []);

  // ── Preset Handler ──
  const applyPreset = useCallback((preset: Preset) => {
    setOrbitType(preset.orbit);
    setPanelArea(preset.panelArea);
    setPanelEfficiency(preset.panelEfficiency);
    setBatteryCapacity(preset.batteryCapacity);
    setDod(preset.dod);
    setSubsystems(prev => prev.map(s => {
      const presetSub = preset.subsystems.find(ps => ps.id === s.id);
      return presetSub ? { ...s, power: presetSub.power, dutyCycle: presetSub.dutyCycle } : s;
    }));
  }, []);

  // ── Calculations ──
  const results = useMemo(() => {
    const orbit = ORBIT_DATA[orbitType];
    const sunAngleRad = (orbit.sunAngleDeg * Math.PI) / 180;
    const cosAngle = Math.cos(sunAngleRad);

    // Power generation
    const powerSunlit = panelArea * (panelEfficiency / 100) * SOLAR_CONSTANT * cosAngle;
    const sunlitFraction = 1 - orbit.eclipseFraction;
    const powerOrbitAvg = powerSunlit * sunlitFraction;

    // Eclipse duration
    const eclipseMinutes = orbit.periodMinutes * orbit.eclipseFraction;

    // Loads
    const peakPower = subsystems.reduce((sum, s) => sum + s.power, 0);
    const avgPower = subsystems.reduce((sum, s) => sum + s.power * (s.dutyCycle / 100), 0);

    // Power margin
    const marginOrbitAvg = powerOrbitAvg - avgPower;
    const marginSunlit = powerSunlit - peakPower;

    // Battery requirement: energy needed to survive eclipse at average load
    const eclipseHours = eclipseMinutes / 60;
    const batteryEnergyRequired = avgPower * eclipseHours; // Wh

    // Usable battery capacity based on DoD
    const usableBattery = batteryCapacity * (dod / 100);
    const batteryAdequate = usableBattery >= batteryEnergyRequired;

    // Battery life estimate
    const orbitsPerDay = (24 * 60) / orbit.periodMinutes;
    const cyclesPerYear = orbitsPerDay * 365.25;
    const totalCycles = cyclesPerYear * missionLifeYears;

    // Rough cycle life estimate: Li-ion at 40% DoD ~ 6000 cycles, at 80% DoD ~ 2000 cycles
    // Linear interpolation: cycles = 10000 - 100*DoD (simplified)
    const estimatedCycleLife = Math.max(500, 10000 - 100 * dod);
    const batteryLifeYears = estimatedCycleLife / cyclesPerYear;
    const batteryMeetsMission = batteryLifeYears >= missionLifeYears;

    return {
      powerSunlit,
      powerOrbitAvg,
      eclipseMinutes,
      peakPower,
      avgPower,
      marginOrbitAvg,
      marginSunlit,
      batteryEnergyRequired,
      usableBattery,
      batteryAdequate,
      orbitsPerDay,
      totalCycles: Math.round(totalCycles),
      estimatedCycleLife,
      batteryLifeYears,
      batteryMeetsMission,
      sunlitFraction,
      periodMinutes: orbit.periodMinutes,
    };
  }, [orbitType, panelArea, panelEfficiency, subsystems, batteryCapacity, dod, missionLifeYears]);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <ScrollReveal>
        <nav className="text-sm text-slate-500 mb-4">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/mission-cost" className="hover:text-slate-300 transition-colors">Mission Planning</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-400">Power Budget Calculator</span>
        </nav>
        </ScrollReveal>

        <AnimatedPageHeader
          title="Satellite Power Budget Calculator"
          subtitle="Design and validate satellite power systems — solar generation, load profiles, battery sizing, and power margins"
          accentColor="amber"
        />

        {/* ── Quick Presets ── */}
        <ScrollReveal>
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Presets</h3>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRESETS.map((preset) => (
              <StaggerItem key={preset.label}>
              <button
                onClick={() => applyPreset(preset)}
                className="w-full text-left p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
              >
                <div className="text-sm font-medium text-white group-hover:text-amber-200">{preset.label}</div>
                <p className="text-xs text-slate-400 mt-0.5">{preset.description}</p>
              </button>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* ── Solar Panel Section ── */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-100 mb-1 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
              Solar Power Generation
            </h3>
            <p className="text-sm text-slate-400 mb-4">Configure solar panel and orbit parameters</p>

            {/* Orbit Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Orbit Type</label>
              <select
                value={orbitType}
                onChange={(e) => setOrbitType(e.target.value as OrbitType)}
                className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
              >
                {(Object.keys(ORBIT_DATA) as OrbitType[]).map((key) => (
                  <option key={key} value={key}>{ORBIT_DATA[key].label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">{ORBIT_DATA[orbitType].description}</p>
            </div>

            <SliderInput
              label="Solar Panel Area"
              value={panelArea}
              min={0.1}
              max={20}
              step={0.1}
              unit="m²"
              onChange={setPanelArea}
              description="Total active cell area (both wings if applicable)"
            />

            <SliderInput
              label="Panel Efficiency"
              value={panelEfficiency}
              min={15}
              max={35}
              step={0.5}
              unit="%"
              onChange={setPanelEfficiency}
              description="GaAs triple-junction: ~30%. Si cells: ~20%. Next-gen: ~35%"
            />

            {/* Fixed display values */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="card p-3 bg-slate-800/30">
                <div className="text-xs text-slate-500 mb-1">Solar Constant</div>
                <div className="text-sm text-amber-300 font-medium">{SOLAR_CONSTANT} W/m²</div>
              </div>
              <div className="card p-3 bg-slate-800/30">
                <div className="text-xs text-slate-500 mb-1">Eclipse Fraction</div>
                <div className="text-sm text-amber-300 font-medium">
                  {(ORBIT_DATA[orbitType].eclipseFraction * 100).toFixed(0)}% of orbit
                </div>
              </div>
              <div className="card p-3 bg-slate-800/30">
                <div className="text-xs text-slate-500 mb-1">Orbital Period</div>
                <div className="text-sm text-slate-200">{ORBIT_DATA[orbitType].periodMinutes} min</div>
              </div>
              <div className="card p-3 bg-slate-800/30">
                <div className="text-xs text-slate-500 mb-1">Sun Incidence Angle</div>
                <div className="text-sm text-slate-200">{ORBIT_DATA[orbitType].sunAngleDeg} deg avg</div>
              </div>
            </div>
          </div>

          {/* ── Battery Section ── */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-100 mb-1 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5H18V15.75c0 .621-.504 1.125-1.125 1.125H5.625A1.125 1.125 0 014.5 15.75V10.5zM3.75 18h15A2.25 2.25 0 0021 15.75v-6a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 001.5 9.75v6A2.25 2.25 0 003.75 18z" />
              </svg>
              Battery &amp; Energy Storage
            </h3>
            <p className="text-sm text-slate-400 mb-4">Size the battery for eclipse survival and cycle life</p>

            <SliderInput
              label="Battery Capacity"
              value={batteryCapacity}
              min={10}
              max={5000}
              step={10}
              unit="Wh"
              onChange={setBatteryCapacity}
              description="Total nameplate capacity of the battery pack"
            />

            <SliderInput
              label="Depth of Discharge (DoD)"
              value={dod}
              min={20}
              max={80}
              step={1}
              unit="%"
              onChange={setDod}
              description="Max allowed DoD per cycle. Lower = longer life, less usable energy"
            />

            <SliderInput
              label="Mission Lifetime"
              value={missionLifeYears}
              min={1}
              max={20}
              step={0.5}
              unit="years"
              onChange={setMissionLifeYears}
              description="Required operational lifetime for battery cycle calculation"
            />

            {/* Battery summary cards */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="card p-3 bg-slate-800/30">
                <div className="text-xs text-slate-500 mb-1">Usable Capacity</div>
                <div className="text-sm text-cyan-300 font-medium">
                  {(batteryCapacity * dod / 100).toFixed(1)} Wh
                </div>
              </div>
              <div className="card p-3 bg-slate-800/30">
                <div className="text-xs text-slate-500 mb-1">Orbits per Day</div>
                <div className="text-sm text-slate-200">{results.orbitsPerDay.toFixed(1)}</div>
              </div>
              <div className="card p-3 bg-slate-800/30">
                <div className="text-xs text-slate-500 mb-1">Total Cycles (mission)</div>
                <div className="text-sm text-slate-200">{results.totalCycles.toLocaleString()}</div>
              </div>
              <div className={`card p-3 ${results.batteryMeetsMission ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="text-xs text-slate-500 mb-1">Est. Battery Life</div>
                <div className={`text-sm font-medium ${results.batteryMeetsMission ? 'text-emerald-400' : 'text-red-400'}`}>
                  {results.batteryLifeYears.toFixed(1)} years
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Load Profile Section ── */}
        <div className="card p-5 mb-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-1 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            Subsystem Load Profile
          </h3>
          <p className="text-sm text-slate-400 mb-4">Define power draw and duty cycle for each subsystem</p>

          {/* Table header */}
          <div className="hidden sm:grid grid-cols-12 gap-3 mb-2 text-xs text-slate-500 uppercase tracking-wider px-1">
            <div className="col-span-4">Subsystem</div>
            <div className="col-span-3">Power (W)</div>
            <div className="col-span-3">Duty Cycle (%)</div>
            <div className="col-span-2 text-right">Avg (W)</div>
          </div>

          {/* Subsystem rows */}
          <div className="space-y-2">
            {subsystems.map((sub) => (
              <div key={sub.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
                <div className="sm:col-span-4">
                  <span className="text-sm text-slate-200">{sub.name}</span>
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={sub.maxPower}
                    step={sub.maxPower <= 100 ? 0.5 : 5}
                    value={sub.power}
                    onChange={(e) => updateSubsystem(sub.id, 'power', parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-purple-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={sub.maxPower}
                    step={sub.maxPower <= 100 ? 0.5 : 5}
                    value={sub.power}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0 && v <= sub.maxPower) updateSubsystem(sub.id, 'power', v);
                    }}
                    className="w-20 bg-slate-900/70 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-100 text-right focus:outline-none focus:border-purple-500/50"
                  />
                  <span className="text-xs text-slate-500 w-4">W</span>
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={sub.dutyCycle}
                    onChange={(e) => updateSubsystem(sub.id, 'dutyCycle', parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-amber-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={sub.dutyCycle}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0 && v <= 100) updateSubsystem(sub.id, 'dutyCycle', v);
                    }}
                    className="w-16 bg-slate-900/70 border border-slate-700/50 rounded px-2 py-1 text-xs text-slate-100 text-right focus:outline-none focus:border-amber-500/50"
                  />
                  <span className="text-xs text-slate-500 w-4">%</span>
                </div>
                <div className="sm:col-span-2 text-right">
                  <span className="text-sm font-medium text-amber-300">
                    {(sub.power * sub.dutyCycle / 100).toFixed(1)} W
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/50">
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Peak Power (all on)</div>
              <div className="text-sm text-purple-300 font-medium">{results.peakPower.toFixed(1)} W</div>
            </div>
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Average Power</div>
              <div className="text-sm text-amber-300 font-medium">{results.avgPower.toFixed(1)} W</div>
            </div>
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Power Generated (sunlit)</div>
              <div className="text-sm text-amber-300 font-medium">{results.powerSunlit.toFixed(1)} W</div>
            </div>
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Power Generated (orbit avg)</div>
              <div className="text-sm text-amber-300 font-medium">{results.powerOrbitAvg.toFixed(1)} W</div>
            </div>
          </div>
        </div>

        {/* ── Power Balance Results ── */}
        <div className="card p-5 mb-6 border border-amber-500/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Power Balance Results
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <ResultCard
              label="Generated (sunlit)"
              value={results.powerSunlit.toFixed(1)}
              unit="W"
              accent="amber"
            />
            <ResultCard
              label="Generated (orbit avg)"
              value={results.powerOrbitAvg.toFixed(1)}
              unit="W"
              accent="amber"
            />
            <ResultCard
              label="Consumed (peak)"
              value={results.peakPower.toFixed(1)}
              unit="W"
              accent="purple"
            />
            <ResultCard
              label="Consumed (average)"
              value={results.avgPower.toFixed(1)}
              unit="W"
              accent="purple"
            />
          </div>

          {/* Power Margin — the key result */}
          <div className={`rounded-xl p-5 mb-4 border ${
            results.marginOrbitAvg >= 0
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : 'bg-red-500/5 border-red-500/30'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Power Margin (orbit avg)</div>
                <div className={`text-3xl font-bold ${results.marginOrbitAvg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {results.marginOrbitAvg >= 0 ? '+' : ''}{results.marginOrbitAvg.toFixed(1)} W
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {results.marginOrbitAvg >= 0
                    ? 'Power system has positive margin. Satellite can sustain operations.'
                    : 'Negative margin! Reduce loads or increase solar panel area/efficiency.'}
                </p>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Sunlit Margin</div>
                <div className={`text-xl font-bold ${results.marginSunlit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {results.marginSunlit >= 0 ? '+' : ''}{results.marginSunlit.toFixed(1)} W
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ResultCard
              label="Eclipse Duration"
              value={results.eclipseMinutes.toFixed(1)}
              unit="min / orbit"
              accent="cyan"
            />
            <ResultCard
              label="Battery Required"
              value={results.batteryEnergyRequired.toFixed(1)}
              unit="Wh (eclipse)"
              accent="cyan"
            />
            <ResultCard
              label="Battery Usable"
              value={results.usableBattery.toFixed(1)}
              unit="Wh"
              accent={results.batteryAdequate ? 'emerald' : 'red'}
              highlight={results.batteryAdequate ? 'positive' : 'negative'}
            />
            <ResultCard
              label="Battery Adequate"
              value={results.batteryAdequate ? 'YES' : 'NO'}
              accent={results.batteryAdequate ? 'emerald' : 'red'}
              highlight={results.batteryAdequate ? 'positive' : 'negative'}
            />
          </div>
        </div>

        {/* ── Formulas & Notes ── */}
        <ScrollReveal delay={0.1}>
        <div className="card p-5 mb-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Formulas & Methodology</h4>
          <div className="text-xs text-slate-500 leading-relaxed space-y-2">
            <p>
              <span className="text-slate-400 font-medium">Power Generated (sunlit):</span> P = A x eta x S x cos(theta),
              where A = panel area (m2), eta = cell efficiency, S = solar constant (1361 W/m2),
              theta = average sun incidence angle.
            </p>
            <p>
              <span className="text-slate-400 font-medium">Orbit Average Power:</span> P_avg = P_sunlit x (1 - eclipse_fraction).
              LEO satellites spend approximately 35% of each orbit in Earth&apos;s shadow.
              GEO satellites experience eclipse only near equinoxes (~1% annually).
            </p>
            <p>
              <span className="text-slate-400 font-medium">Battery Energy Required:</span> E = P_avg_load x t_eclipse.
              The battery must supply the average load for the full eclipse duration.
              Usable energy = Capacity x DoD.
            </p>
            <p>
              <span className="text-slate-400 font-medium">Battery Cycle Life:</span> Estimated using a
              simplified Li-ion degradation model. Lower depth of discharge significantly extends cycle life.
              At 40% DoD, typical space-grade Li-ion cells achieve 5,000-8,000 cycles.
            </p>
          </div>
        </div>
        </ScrollReveal>

        {/* ── Related Tools ── */}
        <ScrollReveal delay={0.2}>
        <div className="card p-5 border border-amber-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Related Tools</h3>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StaggerItem>
            <Link
              href="/orbital-calculator"
              className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-amber-200">
                Orbital Calculator
              </div>
              <p className="text-xs text-slate-400 mt-1">Delta-v, periods, decay estimates</p>
            </Link>
            </StaggerItem>
            <StaggerItem>
            <Link
              href="/launch-cost-calculator"
              className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-amber-200">
                Launch Cost Calculator
              </div>
              <p className="text-xs text-slate-400 mt-1">Estimate satellite launch costs</p>
            </Link>
            </StaggerItem>
            <StaggerItem>
            <Link
              href="/mission-cost"
              className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-amber-200">
                Mission Cost Estimator
              </div>
              <p className="text-xs text-slate-400 mt-1">Full mission cost breakdown</p>
            </Link>
            </StaggerItem>
            <StaggerItem>
            <Link
              href="/satellites"
              className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-amber-200">
                Satellite Tracker
              </div>
              <p className="text-xs text-slate-400 mt-1">Track objects in orbit</p>
            </Link>
            </StaggerItem>
          </StaggerContainer>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
