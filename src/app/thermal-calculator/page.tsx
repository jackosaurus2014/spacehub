'use client';

import { useState, useMemo, useCallback } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const SOLAR_FLUX = 1361; // W/m² at 1 AU
const EARTH_IR = 237; // W/m² average
const ALBEDO_COEFF = 0.30; // Earth average albedo
const STEFAN_BOLTZMANN = 5.67e-8; // W/m²K⁴
const EARTH_RADIUS_KM = 6371; // km

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface SurfaceMaterial {
  name: string;
  alpha: number; // solar absorptivity
  epsilon: number; // IR emissivity
  description: string;
}

interface TemperatureLimit {
  component: string;
  minC: number;
  maxC: number;
  icon: string;
}

interface ThermalTechnique {
  name: string;
  type: 'passive' | 'active';
  description: string;
  massImpact: string;
  powerImpact: string;
  costImpact: string;
  effectiveness: string;
}

interface ThermalResults {
  hotCaseC: number;
  coldCaseC: number;
  equilibriumC: number;
  solarInput: number;
  albedoInput: number;
  earthIRInput: number;
  internalInput: number;
  totalInput: number;
  radiatedPower: number;
  eclipseFraction: number;
  viewFactor: number;
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const SURFACE_MATERIALS: SurfaceMaterial[] = [
  { name: 'Aluminum', alpha: 0.38, epsilon: 0.05, description: 'Bare aluminum alloy' },
  { name: 'White Paint', alpha: 0.20, epsilon: 0.92, description: 'S13G/LO-1 white coating' },
  { name: 'MLI', alpha: 0.14, epsilon: 0.04, description: 'Multi-layer insulation blanket' },
  { name: 'Solar Cells', alpha: 0.75, epsilon: 0.82, description: 'GaAs triple-junction cells' },
  { name: 'Gold', alpha: 0.30, epsilon: 0.03, description: 'Vapor-deposited gold film' },
  { name: 'OSR', alpha: 0.08, epsilon: 0.80, description: 'Optical solar reflector' },
];

const TEMPERATURE_LIMITS: TemperatureLimit[] = [
  { component: 'Electronics', minC: -40, maxC: 85, icon: 'CPU' },
  { component: 'Batteries (Li-ion)', minC: 0, maxC: 45, icon: 'BAT' },
  { component: 'Propellant (Hydrazine)', minC: 7, maxC: 40, icon: 'PROP' },
  { component: 'Solar Panels', minC: -100, maxC: 100, icon: 'SOL' },
  { component: 'Star Trackers', minC: -20, maxC: 50, icon: 'STR' },
  { component: 'Reaction Wheels', minC: -10, maxC: 50, icon: 'RWL' },
];

const THERMAL_TECHNIQUES: ThermalTechnique[] = [
  // Passive
  {
    name: 'Surface Coatings',
    type: 'passive',
    description: 'Paints and surface treatments to control alpha/epsilon ratios. White paints reflect solar energy; black coatings maximize radiation.',
    massImpact: 'Negligible (<0.1 kg/m\u00B2)',
    powerImpact: 'None',
    costImpact: 'Low ($1K-10K)',
    effectiveness: 'Moderate - limited by alpha/epsilon ratio',
  },
  {
    name: 'MLI Blankets',
    type: 'passive',
    description: 'Multi-layer insulation using alternating reflective films and spacers. Reduces radiative and conductive heat transfer by 10-100x.',
    massImpact: 'Low (0.5-1.5 kg/m\u00B2)',
    powerImpact: 'None',
    costImpact: 'Moderate ($5K-50K/m\u00B2)',
    effectiveness: 'High - primary insulation method',
  },
  {
    name: 'Heat Pipes',
    type: 'passive',
    description: 'Sealed tubes with working fluid that transfers heat via evaporation/condensation. Effective over short to medium distances.',
    massImpact: 'Moderate (0.3-1.0 kg per pipe)',
    powerImpact: 'None',
    costImpact: 'Moderate ($10K-100K each)',
    effectiveness: 'High - conductance 100x copper',
  },
  {
    name: 'Radiators',
    type: 'passive',
    description: 'High-emissivity panels that reject waste heat to space via radiation. Sized based on worst-case hot dissipation.',
    massImpact: 'Moderate (2-5 kg/m\u00B2)',
    powerImpact: 'None',
    costImpact: 'Moderate ($20K-200K/m\u00B2)',
    effectiveness: 'High - primary heat rejection',
  },
  // Active
  {
    name: 'Heaters',
    type: 'active',
    description: 'Electric resistance heaters (patch, cartridge, or strip) to maintain minimum temperatures during eclipse or cold cases.',
    massImpact: 'Low (10-100 g each)',
    powerImpact: 'Moderate (1-50 W each)',
    costImpact: 'Low ($500-5K each)',
    effectiveness: 'High - precise temp control',
  },
  {
    name: 'Louvers',
    type: 'active',
    description: 'Bi-metallic or motor-driven blades that vary effective emissivity. Open to radiate heat, close to retain it. Turndown ratio 6:1.',
    massImpact: 'Moderate (1-3 kg/m\u00B2)',
    powerImpact: 'Low (0-5 W for motorized)',
    costImpact: 'High ($50K-300K/m\u00B2)',
    effectiveness: 'High - adaptive rejection',
  },
  {
    name: 'Heat Pumps',
    type: 'active',
    description: 'Mechanically pumped fluid loops for high-power thermal transport. Used when heat pipes cannot reach radiator locations.',
    massImpact: 'High (5-20 kg system)',
    powerImpact: 'High (20-200 W)',
    costImpact: 'High ($200K-2M)',
    effectiveness: 'Very high - long distance transport',
  },
  {
    name: 'Cryocoolers',
    type: 'active',
    description: 'Mechanical refrigeration for IR detectors, focal planes, or superconducting devices. Pulse tube or Stirling cycle.',
    massImpact: 'High (3-30 kg)',
    powerImpact: 'Very high (30-300 W)',
    costImpact: 'Very high ($500K-5M)',
    effectiveness: 'Essential - only way to reach <80K',
  },
];

// ────────────────────────────────────────
// Thermal Calculation Engine
// ────────────────────────────────────────

function calculateViewFactor(altitudeKm: number): number {
  // Earth view factor for a flat plate facing nadir
  // F = 1 - cos(rho), where sin(rho) = R_earth / (R_earth + h)
  const sinRho = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm);
  const rho = Math.asin(sinRho);
  return (1 - Math.cos(rho)) / 2; // hemisphere-averaged
}

function calculateEclipseFraction(altitudeKm: number, betaAngleDeg: number): number {
  // Eclipse fraction based on orbital geometry
  // When beta angle > critical angle, no eclipse (full sun)
  const orbitRadius = EARTH_RADIUS_KM + altitudeKm;
  const sinRho = EARTH_RADIUS_KM / orbitRadius;
  const rho = Math.asin(sinRho); // angular radius of Earth
  const betaRad = (betaAngleDeg * Math.PI) / 180;

  // Critical beta angle: above this, orbit is fully sunlit
  const betaCritical = Math.PI / 2 - rho;
  if (Math.abs(betaRad) >= betaCritical) {
    return 0; // no eclipse
  }

  // Eclipse half-angle
  const cosEclipseHalf = Math.sqrt(1 - sinRho * sinRho) / Math.cos(betaRad);
  if (cosEclipseHalf >= 1) return 0;
  if (cosEclipseHalf <= -1) return 1;

  const eclipseHalfAngle = Math.acos(cosEclipseHalf);
  return eclipseHalfAngle / Math.PI;
}

function calculateThermal(
  altitudeKm: number,
  inclinationDeg: number,
  betaAngleDeg: number,
  surfaceAreaM2: number,
  internalHeatW: number,
  alpha: number,
  epsilon: number,
): ThermalResults {
  const viewFactor = calculateViewFactor(altitudeKm);
  const eclipseFraction = calculateEclipseFraction(altitudeKm, betaAngleDeg);
  const sunlitFraction = 1 - eclipseFraction;

  // Projected area for solar input (assume sphere-like: A_sun = A/4 for tumbling, or A/2 for flat plate)
  // Using A/4 for a more general spacecraft assumption
  const projectedSolarArea = surfaceAreaM2 / 4;
  const earthFacingArea = surfaceAreaM2 / 2; // nadir-facing hemisphere

  // Heat inputs (sunlit case)
  const solarInput = alpha * SOLAR_FLUX * projectedSolarArea;
  const albedoInput = alpha * ALBEDO_COEFF * SOLAR_FLUX * viewFactor * earthFacingArea;
  const earthIRInput = epsilon * EARTH_IR * viewFactor * earthFacingArea;
  const internalInput = internalHeatW;

  // Total heat input for hot case (sunlit)
  const totalHot = solarInput + albedoInput + earthIRInput + internalInput;

  // Total heat input for cold case (eclipse - no solar, no albedo)
  const totalCold = earthIRInput + internalInput;

  // Orbit-average total
  const totalAvg = totalHot * sunlitFraction + totalCold * eclipseFraction;

  // Equilibrium temperature: T = (Q / (epsilon * sigma * A))^0.25
  const hotCaseK = Math.pow(totalHot / (epsilon * STEFAN_BOLTZMANN * surfaceAreaM2), 0.25);
  const coldCaseK = Math.pow(totalCold / (epsilon * STEFAN_BOLTZMANN * surfaceAreaM2), 0.25);
  const equilibriumK = Math.pow(totalAvg / (epsilon * STEFAN_BOLTZMANN * surfaceAreaM2), 0.25);

  // Radiated power at equilibrium
  const radiatedPower = epsilon * STEFAN_BOLTZMANN * surfaceAreaM2 * Math.pow(equilibriumK, 4);

  return {
    hotCaseC: hotCaseK - 273.15,
    coldCaseC: coldCaseK - 273.15,
    equilibriumC: equilibriumK - 273.15,
    solarInput,
    albedoInput,
    earthIRInput,
    internalInput,
    totalInput: totalAvg,
    radiatedPower,
    eclipseFraction,
    viewFactor,
  };
}

// ────────────────────────────────────────
// Helper components
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
  onChange: (val: number) => void;
  description?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-sm font-mono text-slate-300">
          {value.toFixed(step < 1 ? 2 : 0)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-slate-400 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
      />
      <div className="flex justify-between text-xs text-slate-600 mt-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
      {description && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}
    </div>
  );
}

function NumberInput({
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
  step?: number;
  unit: string;
  onChange: (val: number) => void;
  description?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step || 1}
          value={value}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= min && val <= max) {
              onChange(val);
            }
          }}
          className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10"
        />
        <span className="text-sm text-slate-400 whitespace-nowrap">{unit}</span>
      </div>
      {description && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}
    </div>
  );
}

function TemperatureCard({
  label,
  tempC,
  accent,
  description,
}: {
  label: string;
  tempC: number;
  accent: 'red' | 'blue' | 'cyan';
  description: string;
}) {
  const accentColors = {
    red: 'text-red-400 border-red-400/30',
    blue: 'text-blue-400 border-blue-400/30',
    cyan: 'text-slate-300 border-white/10',
  };

  const bgGradients = {
    red: 'from-red-500/10 to-transparent',
    blue: 'from-blue-500/10 to-transparent',
    cyan: 'from-white/5 to-transparent',
  };

  return (
    <div className={`card p-5 text-center bg-gradient-to-b ${bgGradients[accent]}`}>
      <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-bold font-mono ${accentColors[accent].split(' ')[0]}`}>
        {isFinite(tempC) ? tempC.toFixed(1) : '--'}
      </div>
      <div className="text-sm text-slate-400 mt-1">{'\u00B0'}C</div>
      <div className="text-xs text-slate-500 mt-2">{description}</div>
    </div>
  );
}

function PowerBalanceBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-sm font-mono text-slate-200">{value.toFixed(1)} W</span>
      </div>
      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(Math.max(pct, 0.5), 100)}%` }}
        />

        <RelatedModules modules={PAGE_RELATIONS['thermal-calculator']} />
      </div>
    </div>
  );
}

function ComponentLimitRow({
  limit,
  hotC,
  coldC,
}: {
  limit: TemperatureLimit;
  hotC: number;
  coldC: number;
}) {
  const hotPass = isFinite(hotC) && hotC <= limit.maxC;
  const coldPass = isFinite(coldC) && coldC >= limit.minC;
  const bothPass = hotPass && coldPass;

  const statusColor = bothPass
    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    : 'text-red-400 bg-red-400/10 border-red-400/30';

  const statusLabel = bothPass ? 'PASS' : 'FAIL';

  // Calculate where the component's range sits on a visual scale
  const scaleMin = -120;
  const scaleMax = 120;
  const scaleRange = scaleMax - scaleMin;
  const leftPct = ((limit.minC - scaleMin) / scaleRange) * 100;
  const widthPct = ((limit.maxC - limit.minC) / scaleRange) * 100;
  const hotPct = isFinite(hotC) ? ((hotC - scaleMin) / scaleRange) * 100 : -1;
  const coldPct = isFinite(coldC) ? ((coldC - scaleMin) / scaleRange) * 100 : -1;

  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 bg-slate-700/50 rounded px-1.5 py-0.5 font-mono">
            {limit.icon}
          </span>
          <span className="text-sm font-medium text-slate-200">{limit.component}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            {limit.minC}{'\u00B0'}C to {limit.maxC}{'\u00B0'}C
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Visual temperature bar */}
      <div className="relative h-3 bg-slate-700/30 rounded-full overflow-visible mt-1">
        {/* Allowable range */}
        <div
          className={`absolute h-full rounded-full ${bothPass ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />

        {/* Cold case marker */}
        {coldPct >= 0 && coldPct <= 100 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-blue-400 bg-slate-900 z-10"
            style={{ left: `${coldPct}%`, transform: 'translate(-50%, -50%)' }}
            title={`Cold: ${coldC.toFixed(1)}\u00B0C`}
          />
        )}

        {/* Hot case marker */}
        {hotPct >= 0 && hotPct <= 100 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-red-400 bg-slate-900 z-10"
            style={{ left: `${hotPct}%`, transform: 'translate(-50%, -50%)' }}
            title={`Hot: ${hotC.toFixed(1)}\u00B0C`}
          />
        )}
      </div>

      {/* Failure details */}
      {!bothPass && (
        <div className="mt-2 text-xs text-red-400/80">
          {!hotPass && (
            <span>Hot case ({hotC.toFixed(1)}{'\u00B0'}C) exceeds max ({limit.maxC}{'\u00B0'}C). </span>
          )}
          {!coldPass && (
            <span>Cold case ({coldC.toFixed(1)}{'\u00B0'}C) below min ({limit.minC}{'\u00B0'}C). </span>
          )}
        </div>
      )}
    </div>
  );
}

function ThermalTechniqueCard({ technique }: { technique: ThermalTechnique }) {
  const isPassive = technique.type === 'passive';

  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
          isPassive
            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
            : 'text-amber-400 bg-amber-400/10 border-amber-400/30'
        }`}>
          {isPassive ? 'PASSIVE' : 'ACTIVE'}
        </span>
        <h4 className="text-sm font-semibold text-slate-100">{technique.name}</h4>
      </div>
      <p className="text-xs text-slate-400 mb-3 leading-relaxed">{technique.description}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-slate-500">Mass: </span>
          <span className="text-slate-300">{technique.massImpact}</span>
        </div>
        <div>
          <span className="text-slate-500">Power: </span>
          <span className="text-slate-300">{technique.powerImpact}</span>
        </div>
        <div>
          <span className="text-slate-500">Cost: </span>
          <span className="text-slate-300">{technique.costImpact}</span>
        </div>
        <div>
          <span className="text-slate-500">Effect: </span>
          <span className="text-slate-300">{technique.effectiveness}</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function ThermalCalculatorPage() {
  // Orbit configuration
  const [altitude, setAltitude] = useState(400);
  const [inclination, setInclination] = useState(51.6); // ISS inclination
  const [betaAngle, setBetaAngle] = useState(30);

  // Spacecraft configuration
  const [surfaceArea, setSurfaceArea] = useState(6.0);
  const [internalHeat, setInternalHeat] = useState(100);
  const [alpha, setAlpha] = useState(0.30);
  const [epsilon, setEpsilon] = useState(0.80);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  // Thermal control techniques filter
  const [techFilter, setTechFilter] = useState<'all' | 'passive' | 'active'>('all');

  // Apply material preset
  const handleMaterialSelect = useCallback((material: SurfaceMaterial) => {
    setAlpha(material.alpha);
    setEpsilon(material.epsilon);
    setSelectedMaterial(material.name);
  }, []);

  // Clear material selection when sliders are manually changed
  const handleAlphaChange = useCallback((val: number) => {
    setAlpha(val);
    setSelectedMaterial(null);
  }, []);

  const handleEpsilonChange = useCallback((val: number) => {
    setEpsilon(val);
    setSelectedMaterial(null);
  }, []);

  // Calculate thermal results
  const results = useMemo((): ThermalResults => {
    return calculateThermal(
      altitude,
      inclination,
      betaAngle,
      surfaceArea,
      internalHeat,
      alpha,
      epsilon,
    );
  }, [altitude, inclination, betaAngle, surfaceArea, internalHeat, alpha, epsilon]);

  // Eclipse fraction (displayed, also recalculated for display)
  const eclipseFraction = useMemo(() => {
    return calculateEclipseFraction(altitude, betaAngle);
  }, [altitude, betaAngle]);

  // Max power for the bar chart scaling
  const maxPower = useMemo(() => {
    return Math.max(
      results.solarInput,
      results.albedoInput,
      results.earthIRInput,
      results.internalInput,
      results.radiatedPower,
      1,
    );
  }, [results]);

  // Filtered techniques
  const filteredTechniques = useMemo(() => {
    if (techFilter === 'all') return THERMAL_TECHNIQUES;
    return THERMAL_TECHNIQUES.filter((t) => t.type === techFilter);
  }, [techFilter]);

  // Count pass/fail
  const limitResults = useMemo(() => {
    let pass = 0;
    let fail = 0;
    for (const limit of TEMPERATURE_LIMITS) {
      const hotOk = isFinite(results.hotCaseC) && results.hotCaseC <= limit.maxC;
      const coldOk = isFinite(results.coldCaseC) && results.coldCaseC >= limit.minC;
      if (hotOk && coldOk) pass++;
      else fail++;
    }
    return { pass, fail };
  }, [results]);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}

        <AnimatedPageHeader
          title="Spacecraft Thermal Analysis"
          subtitle="Calculate equilibrium temperatures, evaluate hot/cold case scenarios, and analyze power balance for any orbit and surface configuration."
          accentColor="amber"
          icon={
            <svg className="w-9 h-9 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          }
        />

        {/* Main Layout */}
        <ScrollReveal>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── Left Column: Inputs ─── */}
          <div className="lg:col-span-1 space-y-6">

            {/* Orbit Configuration */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.893 13.393l-1.135-1.135a2.252 2.252 0 01-.421-.585l-1.08-2.16a.414.414 0 00-.663-.107.827.827 0 01-.812.21l-1.273-.363a.89.89 0 00-.738 1.595l.587.39c.59.395.674 1.23.172 1.732l-.2.2c-.212.212-.33.498-.33.796v.41c0 .409-.11.809-.32 1.158l-1.315 2.191a2.11 2.11 0 01-1.81 1.025 1.055 1.055 0 01-1.055-1.055v-1.172c0-.92-.56-1.747-1.414-2.089l-.655-.261a2.25 2.25 0 01-1.383-2.46l.007-.042a2.25 2.25 0 01.29-.787l.09-.15a2.25 2.25 0 012.37-1.048l1.178.236a1.125 1.125 0 001.302-.795l.208-.73a1.125 1.125 0 00-.578-1.315l-.665-.332-.091.091a2.25 2.25 0 01-1.591.659h-.18c-.249 0-.487.1-.662.274a.931.931 0 01-1.458-1.137l1.411-2.353a2.25 2.25 0 00.286-.76M11.25 2.25L12 2.25" />
                </svg>
                Orbit Configuration
              </h2>

              <div className="space-y-5">
                <SliderInput
                  label="Orbit Altitude"
                  value={altitude}
                  min={200}
                  max={36000}
                  step={50}
                  unit="km"
                  onChange={setAltitude}
                  description={altitude < 2000 ? 'LEO' : altitude < 20000 ? 'MEO' : 'GEO region'}
                />

                <SliderInput
                  label="Orbit Inclination"
                  value={inclination}
                  min={0}
                  max={90}
                  step={0.1}
                  unit={'\u00B0'}
                  onChange={setInclination}
                  description={inclination < 10 ? 'Equatorial' : inclination > 80 ? 'Polar' : inclination > 95 ? 'Sun-synchronous' : 'Inclined'}
                />

                <SliderInput
                  label="Beta Angle"
                  value={betaAngle}
                  min={0}
                  max={90}
                  step={0.5}
                  unit={'\u00B0'}
                  onChange={setBetaAngle}
                  description="Sun angle to orbital plane"
                />

                {/* Calculated eclipse fraction */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Eclipse Fraction</span>
                    <span className="text-sm font-mono text-amber-400">
                      {(eclipseFraction * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-slate-600 to-slate-500 rounded-full transition-all duration-300"
                      style={{ width: `${eclipseFraction * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 mt-1">
                    <span>Sunlit: {((1 - eclipseFraction) * 100).toFixed(1)}%</span>
                    <span>Eclipse: {(eclipseFraction * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* View factor */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Earth View Factor</span>
                    <span className="text-sm font-mono text-slate-300">
                      {results.viewFactor.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spacecraft Configuration */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Spacecraft Configuration
              </h2>

              <div className="space-y-5">
                <NumberInput
                  label="Surface Area"
                  value={surfaceArea}
                  min={0.1}
                  max={500}
                  step={0.1}
                  unit="m\u00B2"
                  onChange={setSurfaceArea}
                  description="Total outer surface area of spacecraft"
                />

                <NumberInput
                  label="Internal Heat Dissipation"
                  value={internalHeat}
                  min={0}
                  max={10000}
                  step={1}
                  unit="W"
                  onChange={setInternalHeat}
                  description="Total waste heat from electronics and payloads"
                />

                <SliderInput
                  label={`Solar Absorptivity (\u03B1)`}
                  value={alpha}
                  min={0.01}
                  max={1.0}
                  step={0.01}
                  unit=""
                  onChange={handleAlphaChange}
                />

                <SliderInput
                  label={`IR Emissivity (\u03B5)`}
                  value={epsilon}
                  min={0.01}
                  max={1.0}
                  step={0.01}
                  unit=""
                  onChange={handleEpsilonChange}
                />

                {/* Alpha/Epsilon ratio */}
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{'\u03B1'}/{'\u03B5'} Ratio</span>
                    <span className={`text-sm font-mono ${
                      alpha / epsilon > 1 ? 'text-red-400' : alpha / epsilon > 0.5 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {(alpha / epsilon).toFixed(3)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {alpha / epsilon > 1 ? 'Hot-biased (absorbs more than emits)' : alpha / epsilon > 0.5 ? 'Moderate thermal balance' : 'Cold-biased (emits more than absorbs)'}
                  </p>
                </div>

                {/* Surface Material Presets */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Surface Material Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SURFACE_MATERIALS.map((material) => (
                      <button
                        key={material.name}
                        onClick={() => handleMaterialSelect(material)}
                        className={`text-left py-2 px-3 rounded-lg text-xs transition-all border ${
                          selectedMaterial === material.name
                            ? 'bg-white/8 border-white/15/40 text-slate-300'
                            : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50 hover:text-slate-300'
                        }`}
                      >
                        <div className="font-medium">{material.name}</div>
                        <div className="text-slate-500 mt-0.5">
                          {'\u03B1'}={material.alpha} {'\u03B5'}={material.epsilon}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Formula Reference */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                </svg>
                Key Constants
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Solar Flux (1 AU)</span>
                  <span className="font-mono text-slate-300">{SOLAR_FLUX} W/m{'\u00B2'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Earth IR</span>
                  <span className="font-mono text-slate-300">{EARTH_IR} W/m{'\u00B2'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Earth Albedo</span>
                  <span className="font-mono text-slate-300">{ALBEDO_COEFF}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Stefan-Boltzmann ({'\u03C3'})</span>
                  <span className="font-mono text-slate-300">5.67e-8 W/m{'\u00B2'}K{'\u2074'}</span>
                </div>
                <div className="border-t border-slate-700/30 my-2" />
                <div className="text-slate-500 leading-relaxed">
                  T = (Q_total / ({'\u03B5'} {'\u00D7'} {'\u03C3'} {'\u00D7'} A)){'\u00B9'}{'\u2044'}{'\u2074'}
                </div>
                <div className="text-slate-500 leading-relaxed">
                  Q_total = {'\u03B1'}SA_sun + Q_int + Q_albedo + Q_earthIR
                </div>
              </div>
            </div>
          </div>

          {/* ─── Right Column: Results ─── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Temperature Results */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TemperatureCard
                label="Hot Case"
                tempC={results.hotCaseC}
                accent="red"
                description="Sunlit equilibrium"
              />
              <TemperatureCard
                label="Cold Case"
                tempC={results.coldCaseC}
                accent="blue"
                description="Eclipse equilibrium"
              />
              <TemperatureCard
                label="Orbit Average"
                tempC={results.equilibriumC}
                accent="cyan"
                description="Time-weighted mean"
              />
            </div>

            {/* Power Balance Breakdown */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-1">Power Balance Breakdown</h2>
              <p className="text-xs text-slate-500 mb-5">
                Orbit-average heat inputs and radiation output
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Heat Inputs</h3>
                  <div className="space-y-3">
                    <PowerBalanceBar
                      label="Direct Solar"
                      value={results.solarInput}
                      maxValue={maxPower}
                      color="bg-gradient-to-r from-amber-500 to-yellow-400"
                    />
                    <PowerBalanceBar
                      label="Earth Albedo"
                      value={results.albedoInput}
                      maxValue={maxPower}
                      color="bg-gradient-to-r from-sky-500 to-slate-400"
                    />
                    <PowerBalanceBar
                      label="Earth IR"
                      value={results.earthIRInput}
                      maxValue={maxPower}
                      color="bg-gradient-to-r from-red-500 to-orange-400"
                    />
                    <PowerBalanceBar
                      label="Internal Dissipation"
                      value={results.internalInput}
                      maxValue={maxPower}
                      color="bg-gradient-to-r from-purple-500 to-pink-400"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-700/30 pt-4">
                  <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Heat Output</h3>
                  <PowerBalanceBar
                    label="Radiated to Space"
                    value={results.radiatedPower}
                    maxValue={maxPower}
                    color="bg-gradient-to-r from-emerald-500 to-teal-400"
                  />
                </div>

                <div className="border-t border-slate-700/30 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-slate-200">Total Input (avg)</span>
                  <span className="text-lg font-bold font-mono text-slate-300">
                    {results.totalInput.toFixed(1)} W
                  </span>
                </div>
              </div>
            </div>

            {/* Temperature Limits Reference */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">Temperature Limits Check</h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-red-400 bg-slate-900 inline-block" />
                    <span className="text-slate-400">Hot</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-400 bg-slate-900 inline-block" />
                    <span className="text-slate-400">Cold</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-full border ${
                    limitResults.fail === 0
                      ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
                      : 'text-red-400 bg-red-400/10 border-red-400/30'
                  }`}>
                    {limitResults.pass}/{TEMPERATURE_LIMITS.length} Pass
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {TEMPERATURE_LIMITS.map((limit) => (
                  <ComponentLimitRow
                    key={limit.component}
                    limit={limit}
                    hotC={results.hotCaseC}
                    coldC={results.coldCaseC}
                  />
                ))}
              </div>
            </div>

            {/* Thermal Control Techniques */}
            <div className="card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-semibold text-slate-100">Thermal Control Techniques</h2>
                <div className="flex gap-2">
                  {(['all', 'passive', 'active'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTechFilter(filter)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all border ${
                        techFilter === filter
                          ? 'bg-white/8 border-white/15/40 text-slate-300'
                          : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50'
                      }`}
                    >
                      {filter === 'all' ? 'All' : filter === 'passive' ? 'Passive' : 'Active'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTechniques.map((technique) => (
                  <ThermalTechniqueCard key={technique.name} technique={technique} />
                ))}
              </div>

              <div className="mt-5 p-4 bg-slate-900/50 border border-slate-700/30 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Design Guidance</h3>
                <ul className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
                  <li>
                    <span className="text-slate-500">{'\u2022'}</span> If the cold case is too cold: add heaters, reduce radiator area, or use MLI to insulate
                  </li>
                  <li>
                    <span className="text-slate-500">{'\u2022'}</span> If the hot case is too hot: increase radiator area, use OSR/white paint coatings, or add louvers
                  </li>
                  <li>
                    <span className="text-slate-500">{'\u2022'}</span> Low {'\u03B1'}/{'\u03B5'} ratio (e.g. OSR, white paint) keeps spacecraft cooler
                  </li>
                  <li>
                    <span className="text-slate-500">{'\u2022'}</span> High {'\u03B1'}/{'\u03B5'} ratio (e.g. bare aluminum, gold) keeps spacecraft warmer
                  </li>
                  <li>
                    <span className="text-slate-500">{'\u2022'}</span> MLI minimizes both absorption and emission -- used to decouple surfaces from the thermal environment
                  </li>
                </ul>
              </div>
            </div>

            {/* Methodology */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                Assumptions and Limitations
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This calculator uses a simplified single-node thermal model assuming uniform temperature
                across the spacecraft. It models the spacecraft as a sphere for solar projection (A/4)
                and assumes nadir-facing geometry for Earth flux (A/2 with view factor). Real spacecraft
                have complex multi-node thermal networks with directional properties, transient responses,
                internal conduction paths, and time-varying attitudes. Results are suitable for
                preliminary design estimates and trade studies. For detailed thermal analysis, use
                specialized tools such as Thermal Desktop, ESATAN-TMS, or OpenThermal.
              </p>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
