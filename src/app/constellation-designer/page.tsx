'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const RE = 6371; // km — Earth mean radius
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

type CoverageGoal = 'global' | 'regional' | 'polar' | 'equatorial';
type PresetName = 'starlink' | 'oneweb' | 'iridium' | 'gps' | 'custom';

interface ConstellationResult {
  numPlanes: number;
  satsPerPlane: number;
  totalSatellites: number;
  inclination: number;
  swathWidthKm: number;
  swathAngularDeg: number;
  interPlaneSpacingDeg: number;
  orbitalPeriodMin: number;
}

interface CostEstimate {
  launchCostPerSat: number;
  totalLaunchCost: number;
  annualOpsCost: number;
  fiveYearTotalCost: number;
}

interface Preset {
  name: string;
  description: string;
  altitude: number;
  inclination: number;
  planes: number;
  satsPerPlane: number;
  coverageGoal: CoverageGoal;
  elevationAngle: number;
}

const PRESETS: Record<Exclude<PresetName, 'custom'>, Preset> = {
  starlink: {
    name: 'Starlink-like',
    description: 'SpaceX broadband LEO mega-constellation',
    altitude: 550,
    inclination: 53,
    planes: 30,
    satsPerPlane: 22,
    coverageGoal: 'global',
    elevationAngle: 25,
  },
  oneweb: {
    name: 'OneWeb-like',
    description: 'Near-polar LEO broadband constellation',
    altitude: 1200,
    inclination: 87.9,
    planes: 12,
    satsPerPlane: 49,
    coverageGoal: 'polar',
    elevationAngle: 10,
  },
  iridium: {
    name: 'Iridium-like',
    description: 'Global voice/data with 66 active satellites',
    altitude: 780,
    inclination: 86.4,
    planes: 6,
    satsPerPlane: 11,
    coverageGoal: 'polar',
    elevationAngle: 8,
  },
  gps: {
    name: 'GPS-like',
    description: 'MEO navigation constellation at 20,200 km',
    altitude: 20200,
    inclination: 55,
    planes: 6,
    satsPerPlane: 4,
    coverageGoal: 'global',
    elevationAngle: 5,
  },
};

const COVERAGE_GOALS: { value: CoverageGoal; label: string; description: string }[] = [
  { value: 'global', label: 'Global', description: 'Full Earth surface coverage' },
  { value: 'regional', label: 'Regional', description: 'Coverage between latitude bounds' },
  { value: 'polar', label: 'Polar', description: 'High-latitude and polar coverage' },
  { value: 'equatorial', label: 'Equatorial', description: 'Equatorial belt coverage' },
];

// ────────────────────────────────────────
// Formatting Helpers
// ────────────────────────────────────────

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtCurrency(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ────────────────────────────────────────
// Slider Input Component
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
    onChange(parseFloat(e.target.value));
  }, [onChange]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= min && val <= max) {
      onChange(val);
    }
  }, [min, max, onChange]);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="flex items-center gap-3 mb-1.5">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInput}
          className="w-28 bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
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
        className="w-full h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-purple-500 [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
      />
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

// ────────────────────────────────────────
// Result Card Component
// ────────────────────────────────────────

function ResultCard({ label, value, unit, accent = 'purple' }: {
  label: string;
  value: string;
  unit?: string;
  accent?: 'purple' | 'cyan' | 'emerald' | 'amber';
}) {
  const colors = {
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
  };
  return (
    <div className="card p-4 text-center">
      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold ${colors[accent]}`}>{value}</div>
      {unit && <div className="text-xs text-slate-500 mt-0.5">{unit}</div>}
    </div>
  );
}

// ────────────────────────────────────────
// Constellation Calculation Engine
// ────────────────────────────────────────

function calculateConstellation(
  coverageGoal: CoverageGoal,
  altitude: number,
  elevationAngle: number,
  latMin: number,
  latMax: number,
  _revisitHours: number,
): ConstellationResult {
  // Earth angular radius from orbit altitude
  const rOrbit = RE + altitude;
  const earthAngularRadius = Math.asin(RE / rOrbit); // radians

  // Nadir angle: angle at spacecraft from sub-satellite point to edge of coverage
  // cos(elevAngle + nadir) = (RE / rOrbit) * cos(elevAngle)
  const elevRad = elevationAngle * DEG;
  const cosRatio = (RE * Math.cos(elevRad)) / rOrbit;
  const nadirAngle = Math.acos(cosRatio) - elevRad; // radians

  // Coverage half-angle on Earth surface (central angle from sub-satellite point)
  const coverageHalfAngle = earthAngularRadius - nadirAngle; // radians (on Earth surface)
  // Ensure valid
  const effectiveCoverageAngle = Math.max(coverageHalfAngle, 0.01);

  // Swath width on Earth surface
  const swathWidthKm = 2 * RE * effectiveCoverageAngle;
  const swathAngularDeg = 2 * effectiveCoverageAngle * RAD;

  // Determine inclination based on coverage goal
  let inclination: number;
  switch (coverageGoal) {
    case 'global':
      inclination = Math.max(Math.abs(latMax), 80);
      break;
    case 'polar':
      inclination = 86 + Math.random() * 4; // 86-90 degrees
      inclination = Math.min(90, Math.max(86, inclination));
      inclination = 87; // deterministic for calculations
      break;
    case 'equatorial':
      inclination = Math.max(Math.abs(latMax), Math.abs(latMin));
      inclination = Math.min(inclination, 30);
      break;
    case 'regional':
      inclination = Math.max(Math.abs(latMax), Math.abs(latMin));
      break;
    default:
      inclination = 53;
  }

  // Number of orbital planes needed
  // For global: planes needed to cover 360 degrees of RAAN
  // The angular spacing between planes should be <= swath angular width * cos(max latitude coverage)
  const effectiveLatMax = coverageGoal === 'equatorial'
    ? Math.max(Math.abs(latMin), Math.abs(latMax))
    : coverageGoal === 'polar'
      ? 90
      : Math.abs(latMax);

  const cosLatFactor = Math.cos(Math.min(effectiveLatMax, 80) * DEG);
  const planeSpacing = swathAngularDeg * Math.max(cosLatFactor, 0.15);
  let numPlanes = Math.ceil(360 / Math.max(planeSpacing, 1));

  // For regional coverage, reduce planes based on longitude span
  if (coverageGoal === 'regional') {
    numPlanes = Math.max(Math.ceil(numPlanes * 0.5), 3);
  }

  // Clamp planes to reasonable range
  numPlanes = Math.max(numPlanes, 2);
  numPlanes = Math.min(numPlanes, 100);

  // Satellites per plane
  // Each satellite covers swathAngularDeg along the orbit track
  // Need to cover 360 degrees of true anomaly
  let satsPerPlane = Math.ceil(360 / Math.max(swathAngularDeg, 1));

  // Revisit time factor: more sats for shorter revisit
  // (simplified: already accounted by full coverage requirement)
  satsPerPlane = Math.max(satsPerPlane, 2);
  satsPerPlane = Math.min(satsPerPlane, 100);

  const totalSatellites = numPlanes * satsPerPlane;

  const interPlaneSpacingDeg = 360 / numPlanes;

  // Orbital period (Kepler's third law)
  const MU_EARTH = 398600.4418;
  const orbitalPeriodSec = 2 * Math.PI * Math.sqrt(Math.pow(rOrbit, 3) / MU_EARTH);
  const orbitalPeriodMin = orbitalPeriodSec / 60;

  return {
    numPlanes,
    satsPerPlane,
    totalSatellites,
    inclination,
    swathWidthKm,
    swathAngularDeg,
    interPlaneSpacingDeg,
    orbitalPeriodMin,
  };
}

function calculateCost(
  totalSatellites: number,
  satelliteMass: number,
): CostEstimate {
  const costPerKg = 5000; // Falcon 9 rideshare baseline
  const launchCostPerSat = satelliteMass * costPerKg;
  const totalLaunchCost = launchCostPerSat * totalSatellites;

  // Annual ops: scale with constellation size, $1-5M per sat/year
  // Smaller sats cost less to operate
  const opsPerSatPerYear = satelliteMass < 50
    ? 1_000_000
    : satelliteMass < 200
      ? 2_000_000
      : satelliteMass < 400
        ? 3_500_000
        : 5_000_000;
  const annualOpsCost = opsPerSatPerYear * totalSatellites;
  const fiveYearTotalCost = totalLaunchCost + (annualOpsCost * 5);

  return { launchCostPerSat, totalLaunchCost, annualOpsCost, fiveYearTotalCost };
}

// ────────────────────────────────────────
// SVG Constellation Visualization
// ────────────────────────────────────────

function ConstellationDiagram({
  numPlanes,
  satsPerPlane,
  inclination,
}: {
  numPlanes: number;
  satsPerPlane: number;
  inclination: number;
}) {
  const svgSize = 280;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const earthR = 60;
  const orbitR = 100;

  // Cap display satellites for visual clarity
  const displayPlanes = Math.min(numPlanes, 12);
  const displaySatsPerPlane = Math.min(satsPerPlane, 16);

  return (
    <svg
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      className="bg-slate-900/50 rounded-xl border border-slate-700/30"
    >
      {/* Background grid */}
      <circle cx={cx} cy={cy} r={orbitR + 30} fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={orbitR + 15} fill="none" stroke="rgba(148,163,184,0.04)" strokeWidth="0.5" />

      {/* Earth */}
      <defs>
        <radialGradient id="earthGradConst">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1e40af" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={earthR} fill="url(#earthGradConst)" />

      {/* Equator line */}
      <line x1={cx - earthR} y1={cy} x2={cx + earthR} y2={cy} stroke="rgba(148,163,184,0.3)" strokeWidth="0.5" strokeDasharray="3 2" />

      {/* Orbital planes */}
      {Array.from({ length: displayPlanes }).map((_, planeIdx) => {
        const raanDeg = (360 / displayPlanes) * planeIdx;
        const raanRad = raanDeg * DEG;
        // Tilt the orbit ellipse based on RAAN and inclination
        const tiltFactor = Math.abs(Math.sin(raanRad)) * Math.cos(inclination * DEG);
        const ry = orbitR * Math.max(Math.abs(Math.cos(raanRad * 0.5 + Math.PI / 4)), 0.3);
        const rotation = raanDeg * 0.5;
        const planeColor = `hsl(${270 + planeIdx * (120 / displayPlanes)}, 70%, 65%)`;

        return (
          <g key={`plane-${planeIdx}`}>
            {/* Orbit ring */}
            <ellipse
              cx={cx}
              cy={cy}
              rx={orbitR}
              ry={ry}
              fill="none"
              stroke={planeColor}
              strokeWidth="0.8"
              strokeDasharray="4 3"
              opacity="0.5"
              transform={`rotate(${rotation} ${cx} ${cy})`}
            />

            {/* Satellites on this plane */}
            {Array.from({ length: displaySatsPerPlane }).map((_, satIdx) => {
              const angle = ((360 / displaySatsPerPlane) * satIdx + tiltFactor * 20) * DEG;
              const x = cx + orbitR * Math.cos(angle) * Math.cos(rotation * DEG) - ry * Math.sin(angle) * Math.sin(rotation * DEG);
              const y = cy + orbitR * Math.cos(angle) * Math.sin(rotation * DEG) + ry * Math.sin(angle) * Math.cos(rotation * DEG);

              return (
                <circle
                  key={`sat-${planeIdx}-${satIdx}`}
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill={planeColor}
                  opacity="0.8"
                />
              );
            })}
          </g>
        );
      })}

      {/* Labels */}
      <text x={cx} y={16} textAnchor="middle" fill="#94a3b8" fontSize="10">
        {numPlanes} planes / {satsPerPlane} sats each
      </text>
      <text x={cx} y={svgSize - 8} textAnchor="middle" fill="#94a3b8" fontSize="9">
        Inclination: {fmtNum(inclination, 1)} deg
      </text>
    </svg>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function ConstellationDesignerPage() {
  // Requirements inputs
  const [coverageGoal, setCoverageGoal] = useState<CoverageGoal>('global');
  const [latMin, setLatMin] = useState(-60);
  const [latMax, setLatMax] = useState(60);
  const [revisitHours, setRevisitHours] = useState(6);
  const [altitude, setAltitude] = useState(550);
  const [elevationAngle, setElevationAngle] = useState(15);
  const [satelliteMass, setSatelliteMass] = useState(100);
  const [activePreset, setActivePreset] = useState<PresetName>('custom');

  // Load a preset
  const loadPreset = useCallback((presetKey: Exclude<PresetName, 'custom'>) => {
    const p = PRESETS[presetKey];
    setAltitude(p.altitude);
    setElevationAngle(p.elevationAngle);
    setCoverageGoal(p.coverageGoal);
    setActivePreset(presetKey);
    if (p.coverageGoal === 'global' || p.coverageGoal === 'polar') {
      setLatMin(-90);
      setLatMax(90);
    }
  }, []);

  // Constellation results
  const constellation = useMemo(() => {
    return calculateConstellation(
      coverageGoal,
      altitude,
      elevationAngle,
      latMin,
      latMax,
      revisitHours,
    );
  }, [coverageGoal, altitude, elevationAngle, latMin, latMax, revisitHours]);

  // Cost estimates
  const cost = useMemo(() => {
    return calculateCost(constellation.totalSatellites, satelliteMass);
  }, [constellation.totalSatellites, satelliteMass]);

  // When user changes any input manually, switch to custom preset
  const handleInputChange = useCallback((setter: (v: number) => void) => {
    return (v: number) => {
      setter(v);
      setActivePreset('custom');
    };
  }, []);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <ScrollReveal delay={0.1}>
        <nav className="text-sm text-slate-500 mb-4">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/satellites" className="hover:text-slate-300 transition-colors">Space Operations</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-400">Constellation Designer</span>
        </nav>

        <AnimatedPageHeader
          title="Satellite Constellation Design Tool"
          subtitle="Design satellite constellations by specifying coverage requirements, orbit parameters, and mission constraints. Get optimized plane/satellite counts with cost estimates."
          accentColor="purple"
        />
        </ScrollReveal>

        {/* ── Constellation Presets ── */}
        <ScrollReveal delay={0.15}>
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Constellation Presets</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(PRESETS) as Exclude<PresetName, 'custom'>[]).map((key) => {
              const p = PRESETS[key];
              return (
                <button
                  key={key}
                  onClick={() => loadPreset(key)}
                  className={`card p-4 text-left transition-all border ${
                    activePreset === key
                      ? 'border-purple-500/40 bg-purple-500/10'
                      : 'border-slate-700/50 hover:border-slate-600/50'
                  }`}
                >
                  <div className={`text-sm font-semibold mb-1 ${
                    activePreset === key ? 'text-purple-300' : 'text-slate-200'
                  }`}>
                    {p.name}
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{p.description}</p>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>{p.altitude.toLocaleString()} km / {p.inclination} deg</div>
                    <div>{p.planes} planes x {p.satsPerPlane} sats = {p.planes * p.satsPerPlane} total</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            <button
              onClick={() => setActivePreset('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                activePreset === 'custom'
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50'
              }`}
            >
              Custom Configuration
            </button>
          </div>
        </section>
        </ScrollReveal>

        {/* ── Requirements Input Section ── */}
        <ScrollReveal delay={0.2}>
        <section className="mb-8">
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-slate-100 mb-1">Coverage Requirements</h2>
            <p className="text-sm text-slate-400 mb-5">
              Define your constellation coverage goals and orbital parameters. The tool calculates the
              minimum number of orbital planes and satellites needed using Walker constellation formulas.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left column — inputs */}
              <div>
                {/* Coverage Goal */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Coverage Goal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COVERAGE_GOALS.map((goal) => (
                      <button
                        key={goal.value}
                        onClick={() => { setCoverageGoal(goal.value); setActivePreset('custom'); }}
                        className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${
                          coverageGoal === goal.value
                            ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                            : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50'
                        }`}
                      >
                        <div>{goal.label}</div>
                        <div className="text-xs opacity-70 mt-0.5">{goal.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Latitude Range */}
                <div className="grid grid-cols-2 gap-4">
                  <SliderInput
                    label="Min Latitude"
                    value={latMin}
                    min={-90}
                    max={90}
                    step={1}
                    unit="deg"
                    onChange={handleInputChange(setLatMin)}
                    description="Southern coverage limit"
                  />
                  <SliderInput
                    label="Max Latitude"
                    value={latMax}
                    min={-90}
                    max={90}
                    step={1}
                    unit="deg"
                    onChange={handleInputChange(setLatMax)}
                    description="Northern coverage limit"
                  />
                </div>

                <SliderInput
                  label="Revisit Time"
                  value={revisitHours}
                  min={1}
                  max={24}
                  step={1}
                  unit="hours"
                  onChange={handleInputChange(setRevisitHours)}
                  description="Maximum time between successive passes over any point"
                />

                <SliderInput
                  label="Orbit Altitude"
                  value={altitude}
                  min={300}
                  max={2000}
                  step={10}
                  unit="km"
                  onChange={handleInputChange(setAltitude)}
                  description="LEO range: 300-2000 km (lower = more drag, higher = larger swath)"
                />

                <SliderInput
                  label="Minimum Elevation Angle"
                  value={elevationAngle}
                  min={5}
                  max={30}
                  step={1}
                  unit="deg"
                  onChange={handleInputChange(setElevationAngle)}
                  description="Minimum angle above the horizon for usable coverage (higher = smaller footprint but better link quality)"
                />
              </div>

              {/* Right column — visualization */}
              <div className="flex flex-col items-center gap-6">
                <ConstellationDiagram
                  numPlanes={constellation.numPlanes}
                  satsPerPlane={constellation.satsPerPlane}
                  inclination={constellation.inclination}
                />

                {/* Quick summary cards */}
                <div className="w-full grid grid-cols-2 gap-3">
                  <div className="card p-3 bg-slate-800/30">
                    <div className="text-xs text-slate-500 mb-1">Coverage Swath</div>
                    <div className="text-sm text-slate-200">{fmtNum(constellation.swathWidthKm, 0)} km</div>
                  </div>
                  <div className="card p-3 bg-slate-800/30">
                    <div className="text-xs text-slate-500 mb-1">Swath Angular Width</div>
                    <div className="text-sm text-slate-200">{fmtNum(constellation.swathAngularDeg, 1)} deg</div>
                  </div>
                  <div className="card p-3 bg-slate-800/30">
                    <div className="text-xs text-slate-500 mb-1">Orbital Period</div>
                    <div className="text-sm text-slate-200">{fmtNum(constellation.orbitalPeriodMin, 1)} min</div>
                  </div>
                  <div className="card p-3 bg-slate-800/30">
                    <div className="text-xs text-slate-500 mb-1">Plane Spacing</div>
                    <div className="text-sm text-slate-200">{fmtNum(constellation.interPlaneSpacingDeg, 1)} deg</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        </ScrollReveal>

        {/* ── Results Section ── */}
        <ScrollReveal delay={0.25}>
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Constellation Design Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <ResultCard
              label="Orbital Planes"
              value={constellation.numPlanes.toString()}
              unit="planes"
              accent="purple"
            />
            <ResultCard
              label="Sats Per Plane"
              value={constellation.satsPerPlane.toString()}
              unit="satellites"
              accent="cyan"
            />
            <ResultCard
              label="Total Satellites"
              value={constellation.totalSatellites.toLocaleString()}
              unit="total"
              accent="emerald"
            />
            <ResultCard
              label="Inclination"
              value={fmtNum(constellation.inclination, 1)}
              unit="degrees"
              accent="amber"
            />
            <ResultCard
              label="Coverage Swath"
              value={fmtNum(constellation.swathWidthKm, 0)}
              unit="km width"
              accent="purple"
            />
            <ResultCard
              label="Inter-Plane Spacing"
              value={fmtNum(constellation.interPlaneSpacingDeg, 1)}
              unit="degrees"
              accent="cyan"
            />
          </div>

          {/* Detailed breakdown card */}
          <div className="card p-5 mt-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Design Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Coverage type</span>
                  <span className="text-slate-200 capitalize">{coverageGoal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Orbit altitude</span>
                  <span className="text-slate-200">{altitude.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Orbit radius (from center)</span>
                  <span className="text-slate-200">{(RE + altitude).toLocaleString()} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Minimum elevation angle</span>
                  <span className="text-slate-200">{elevationAngle} deg</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Latitude range</span>
                  <span className="text-slate-200">{latMin} deg to {latMax} deg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target revisit time</span>
                  <span className="text-slate-200">{revisitHours} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Orbital period</span>
                  <span className="text-slate-200">{fmtNum(constellation.orbitalPeriodMin, 1)} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Walker notation</span>
                  <span className="text-slate-200">
                    {constellation.inclination.toFixed(0)} deg: {constellation.totalSatellites}/{constellation.numPlanes}/1
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
        </ScrollReveal>

        {/* ── Cost Estimation Section ── */}
        <ScrollReveal delay={0.3}>
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Cost Estimation</h2>
          <div className="card p-5 mb-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Satellite Parameters</h3>
            <p className="text-xs text-slate-500 mb-4">
              Adjust satellite mass to estimate launch and operations costs. Launch pricing based on
              Falcon 9 rideshare rates (~$5,000/kg). Operations costs scale with satellite complexity.
            </p>
            <div className="max-w-md">
              <SliderInput
                label="Estimated Satellite Mass"
                value={satelliteMass}
                min={10}
                max={500}
                step={5}
                unit="kg"
                onChange={setSatelliteMass}
                description="Dry mass per satellite (CubeSat ~10kg, small sat ~100kg, medium ~300kg)"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <ResultCard
              label="Launch Cost / Satellite"
              value={fmtCurrency(cost.launchCostPerSat)}
              accent="purple"
            />
            <ResultCard
              label="Total Launch Cost"
              value={fmtCurrency(cost.totalLaunchCost)}
              accent="cyan"
            />
            <ResultCard
              label="Annual Operations"
              value={fmtCurrency(cost.annualOpsCost)}
              unit="per year"
              accent="emerald"
            />
            <ResultCard
              label="5-Year Total Cost"
              value={fmtCurrency(cost.fiveYearTotalCost)}
              unit="launch + ops"
              accent="amber"
            />
          </div>

          {/* Cost breakdown table */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Cost Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
                    <th className="pb-2 pr-4">Item</th>
                    <th className="pb-2 pr-4 text-right">Per Unit</th>
                    <th className="pb-2 pr-4 text-right">Quantity</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-700/30">
                    <td className="py-2.5 pr-4">Launch cost ({satelliteMass} kg x $5K/kg)</td>
                    <td className="py-2.5 pr-4 text-right text-slate-400">{fmtCurrency(cost.launchCostPerSat)}</td>
                    <td className="py-2.5 pr-4 text-right text-slate-400">{constellation.totalSatellites}</td>
                    <td className="py-2.5 text-right font-medium">{fmtCurrency(cost.totalLaunchCost)}</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-2.5 pr-4">Annual operations</td>
                    <td className="py-2.5 pr-4 text-right text-slate-400">
                      {fmtCurrency(cost.annualOpsCost / constellation.totalSatellites)}/sat/yr
                    </td>
                    <td className="py-2.5 pr-4 text-right text-slate-400">{constellation.totalSatellites}</td>
                    <td className="py-2.5 text-right font-medium">{fmtCurrency(cost.annualOpsCost)}/yr</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-2.5 pr-4">5-year operations</td>
                    <td className="py-2.5 pr-4 text-right text-slate-400">-</td>
                    <td className="py-2.5 pr-4 text-right text-slate-400">5 years</td>
                    <td className="py-2.5 text-right font-medium">{fmtCurrency(cost.annualOpsCost * 5)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="py-2.5 pr-4 text-purple-300">5-Year Total (Launch + Ops)</td>
                    <td className="py-2.5 pr-4 text-right">-</td>
                    <td className="py-2.5 pr-4 text-right">-</td>
                    <td className="py-2.5 text-right text-purple-300">{fmtCurrency(cost.fiveYearTotalCost)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
              <p className="text-xs text-slate-400">
                <span className="text-purple-400 font-medium">Note:</span> These are rough order-of-magnitude
                estimates. Actual costs vary significantly based on launch vehicle selection, rideshare opportunities,
                satellite manufacturing scale, and ground segment architecture. Use the{' '}
                <Link href="/launch-cost-calculator" className="text-purple-400 hover:text-purple-300 underline">
                  Launch Cost Calculator
                </Link>{' '}
                for detailed per-launch pricing with specific vehicles.
              </p>
            </div>
          </div>
        </section>
        </ScrollReveal>

        {/* ── Formulas & Methodology ── */}
        <ScrollReveal delay={0.35}>
        <section className="mb-8">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Walker Constellation Formulas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-500 leading-relaxed">
              <div>
                <h4 className="text-slate-400 font-medium mb-1">Coverage Geometry</h4>
                <p className="mb-2">
                  The coverage swath is derived from the Earth central angle visible from orbit at
                  the minimum elevation angle. The nadir angle is found from:
                  cos(elev + nadir) = (R_E / (R_E + h)) * cos(elev), where h is the orbit altitude
                  and elev is the minimum elevation angle. The Earth central angle is then:
                  lambda = arcsin(R_E / (R_E + h)) - nadir.
                </p>
                <p>
                  Swath width S = 2 * R_E * lambda (in km), where R_E = 6,371 km.
                  The angular swath S_deg = 2 * lambda (in degrees).
                </p>
              </div>
              <div>
                <h4 className="text-slate-400 font-medium mb-1">Plane & Satellite Counts</h4>
                <p className="mb-2">
                  For global coverage, the number of orbital planes N_planes = ceil(360 / (S_deg * cos(lat_max))),
                  accounting for convergence of ground tracks at higher latitudes. Satellites per plane
                  N_sats = ceil(360 / S_deg) to ensure continuous along-track coverage.
                </p>
                <p>
                  Walker notation i:T/P/F describes the constellation with inclination i, total satellites T,
                  number of planes P, and relative phasing F. Inter-plane spacing = 360/P degrees of RAAN.
                </p>
              </div>
            </div>
          </div>
        </section>
        </ScrollReveal>

        {/* ── Related Tools ── */}
        <ScrollReveal delay={0.4}>
        <div className="card p-5 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Related Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/orbital-calculator"
              className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-purple-200">
                Orbital Calculator
              </div>
              <p className="text-xs text-slate-400 mt-1">Delta-v, periods, and decay analysis</p>
            </Link>
            <Link
              href="/launch-cost-calculator"
              className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-purple-200">
                Launch Cost Calculator
              </div>
              <p className="text-xs text-slate-400 mt-1">Detailed per-launch pricing</p>
            </Link>
            <Link
              href="/constellations"
              className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-purple-200">
                Constellation Tracker
              </div>
              <p className="text-xs text-slate-400 mt-1">Track active satellite constellations</p>
            </Link>
            <Link
              href="/satellites"
              className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-purple-200">
                Satellite Tracker
              </div>
              <p className="text-xs text-slate-400 mt-1">Track objects in orbit</p>
            </Link>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
