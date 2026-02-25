'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// ────────────────────────────────────────
// Physical Constants
// ────────────────────────────────────────

const MU_EARTH = 398600.4418; // km^3/s^2  — Earth gravitational parameter
const RE = 6371;              // km        — Earth mean radius
const MU_MOON = 4902.8;       // km^3/s^2  — Moon gravitational parameter
const R_MOON = 1737.4;        // km        — Moon mean radius
const MU_MARS = 42828.37;     // km^3/s^2  — Mars gravitational parameter
const R_MARS = 3389.5;        // km        — Mars mean radius

type TabType = 'delta-v' | 'period' | 'escape' | 'decay';
type CelestialBody = 'earth' | 'moon' | 'mars';

const BODY_DATA: Record<CelestialBody, { label: string; mu: number; radius: number; hasAtmosphere: boolean }> = {
  earth: { label: 'Earth', mu: MU_EARTH, radius: RE, hasAtmosphere: true },
  moon:  { label: 'Moon',  mu: MU_MOON,  radius: R_MOON, hasAtmosphere: false },
  mars:  { label: 'Mars',  mu: MU_MARS,  radius: R_MARS, hasAtmosphere: true },
};

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'delta-v', label: 'Delta-V', icon: 'dv' },
  { id: 'period',  label: 'Period & Velocity', icon: 'pv' },
  { id: 'escape',  label: 'Escape Velocity', icon: 'ev' },
  { id: 'decay',   label: 'Orbital Decay', icon: 'od' },
];

// ────────────────────────────────────────
// Formatting Helpers
// ────────────────────────────────────────

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 24) {
    const days = (seconds / 86400).toFixed(2);
    return `${days} days`;
  }
  return `${h}h ${m}m ${s}s`;
}

function fmtNum(n: number, decimals = 3): string {
  return n.toFixed(decimals);
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
  logScale = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  description?: string;
  logScale?: boolean;
}) {
  const sliderVal = logScale ? Math.log10(Math.max(value, 1)) : value;
  const sliderMin = logScale ? Math.log10(Math.max(min, 1)) : min;
  const sliderMax = logScale ? Math.log10(max) : max;
  const sliderStep = logScale ? 0.01 : step;

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    const actual = logScale ? Math.round(Math.pow(10, raw)) : parseFloat(raw.toFixed(6));
    onChange(actual);
  }, [logScale, onChange]);

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
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={sliderVal}
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
// Tab 1: Delta-V Calculator
// ────────────────────────────────────────

function DeltaVCalculator() {
  const [alt1, setAlt1] = useState(400);
  const [alt2, setAlt2] = useState(35786);

  const results = useMemo(() => {
    const r1 = RE + alt1;
    const r2 = RE + alt2;
    // Ensure r2 > r1 for Hohmann transfer (swap if needed)
    const rLow = Math.min(r1, r2);
    const rHigh = Math.max(r1, r2);
    const a_transfer = (rLow + rHigh) / 2;

    // Hohmann transfer burns
    const v_circ1 = Math.sqrt(MU_EARTH / rLow);
    const v_transfer_peri = Math.sqrt(MU_EARTH * (2 / rLow - 1 / a_transfer));
    const dv1 = Math.abs(v_transfer_peri - v_circ1);

    const v_circ2 = Math.sqrt(MU_EARTH / rHigh);
    const v_transfer_apo = Math.sqrt(MU_EARTH * (2 / rHigh - 1 / a_transfer));
    const dv2 = Math.abs(v_circ2 - v_transfer_apo);

    const totalDv = dv1 + dv2;

    // Transfer time = half the period of transfer ellipse
    const transferTime = Math.PI * Math.sqrt(Math.pow(a_transfer, 3) / MU_EARTH);

    return { dv1, dv2, totalDv, transferTime, rLow, rHigh, a_transfer };
  }, [alt1, alt2]);

  // SVG Orbit Diagram dimensions
  const svgSize = 280;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const maxR = svgSize / 2 - 20;
  // Scale radii to fit SVG
  const scale = maxR / (results.rHigh * 1.1);
  const svgR1 = results.rLow * scale;
  const svgR2 = results.rHigh * scale;
  const svgEarth = RE * scale;
  // Transfer ellipse: semi-major axis = (rLow + rHigh) / 2, semi-minor = sqrt(rLow * rHigh)
  const ellipseA = results.a_transfer * scale;
  const ellipseB = Math.sqrt(results.rLow * results.rHigh) * scale;
  // Center of the ellipse is offset from center of Earth
  const ellipseOffset = ellipseA - svgR1;

  return (
    <div>
      <div className="card p-5 mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Hohmann Transfer Delta-V</h3>
        <p className="text-sm text-slate-400 mb-4">
          Calculate the delta-v required for a Hohmann transfer orbit between two circular orbits around Earth.
          This is the most fuel-efficient two-impulse transfer between coplanar circular orbits.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SliderInput
              label="Starting Orbit Altitude"
              value={alt1}
              min={160}
              max={50000}
              step={10}
              unit="km"
              onChange={setAlt1}
              logScale
              description="Altitude above Earth surface (LEO: ~400 km, MEO: ~20,000 km)"
            />
            <SliderInput
              label="Target Orbit Altitude"
              value={alt2}
              min={160}
              max={100000}
              step={10}
              unit="km"
              onChange={setAlt2}
              logScale
              description="Altitude above Earth surface (GEO: 35,786 km)"
            />
          </div>

          {/* SVG Orbit Diagram */}
          <div className="flex items-center justify-center">
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="bg-slate-900/50 rounded-xl border border-slate-700/30">
              {/* Grid lines */}
              <circle cx={cx} cy={cy} r={maxR} fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="0.5" />
              <circle cx={cx} cy={cy} r={maxR * 0.66} fill="none" stroke="rgba(148,163,184,0.05)" strokeWidth="0.5" />
              <circle cx={cx} cy={cy} r={maxR * 0.33} fill="none" stroke="rgba(148,163,184,0.05)" strokeWidth="0.5" />

              {/* Earth */}
              <circle cx={cx} cy={cy} r={Math.max(svgEarth, 6)} fill="url(#earthGrad)" />
              <defs>
                <radialGradient id="earthGrad">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#1e40af" />
                </radialGradient>
              </defs>

              {/* Starting orbit (inner) */}
              <circle cx={cx} cy={cy} r={Math.max(svgR1, 8)} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />

              {/* Target orbit (outer) */}
              <circle cx={cx} cy={cy} r={Math.max(svgR2, 12)} fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />

              {/* Transfer ellipse — half-ellipse from inner to outer */}
              <ellipse
                cx={cx + ellipseOffset}
                cy={cy}
                rx={ellipseA}
                ry={ellipseB}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="6 3"
                opacity="0.8"
                clipPath="url(#halfClip)"
              />
              <defs>
                <clipPath id="halfClip">
                  <rect x="0" y="0" width={svgSize} height={cy} />
                </clipPath>
              </defs>

              {/* Burn 1 marker */}
              <circle cx={cx - Math.max(svgR1, 8)} cy={cy} r="4" fill="#a78bfa" stroke="#c4b5fd" strokeWidth="1" />
              {/* Burn 2 marker */}
              <circle cx={cx + Math.max(svgR2, 12)} cy={cy} r="4" fill="#22d3ee" stroke="#67e8f9" strokeWidth="1" />

              {/* Labels */}
              <text x={cx} y={16} textAnchor="middle" fill="#94a3b8" fontSize="10">Transfer Orbit</text>
              <text x={cx - Math.max(svgR1, 8)} y={cy + 16} textAnchor="middle" fill="#a78bfa" fontSize="9">Burn 1</text>
              <text x={cx + Math.max(svgR2, 12)} y={cy + 16} textAnchor="middle" fill="#22d3ee" fontSize="9">Burn 2</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ResultCard label="Total Delta-V" value={fmtNum(results.totalDv)} unit="km/s" accent="purple" />
        <ResultCard label="Burn 1 (Departure)" value={fmtNum(results.dv1)} unit="km/s" accent="cyan" />
        <ResultCard label="Burn 2 (Arrival)" value={fmtNum(results.dv2)} unit="km/s" accent="emerald" />
        <ResultCard label="Transfer Time" value={fmtTime(results.transferTime)} accent="amber" />
      </div>

      <div className="card p-4 mt-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">How it works</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          A Hohmann transfer uses two engine burns to move between circular orbits. The first burn at perigee
          raises the apogee to the target orbit altitude. The spacecraft coasts along the transfer ellipse for
          half an orbital period, then a second burn at apogee circularizes the orbit. This is the minimum-energy
          transfer between two coplanar circular orbits, requiring the least total delta-v. For the formulas:
          ΔV₁ = √(μ/r₁) * (√(2r₂/(r₁+r₂)) - 1) and ΔV₂ = √(μ/r₂) * (1 - √(2r₁/(r₁+r₂))),
          where μ = 398,600.4418 km³/s² and r = R_E + altitude.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 2: Orbital Period & Velocity
// ────────────────────────────────────────

function PeriodVelocityCalculator() {
  const [altitude, setAltitude] = useState(400);
  const [eccentricity, setEccentricity] = useState(0);

  const results = useMemo(() => {
    const rPerigee = RE + altitude;
    // Semi-major axis from perigee and eccentricity: a = rp / (1 - e)
    const a = rPerigee / (1 - eccentricity);
    const rApogee = a * (1 + eccentricity);
    const apogeeAlt = rApogee - RE;

    // Orbital period: T = 2π √(a³/μ)
    const period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / MU_EARTH);

    // Velocity at perigee: v = √(μ(2/r - 1/a))
    const vPerigee = Math.sqrt(MU_EARTH * (2 / rPerigee - 1 / a));

    // Velocity at apogee
    const vApogee = Math.sqrt(MU_EARTH * (2 / rApogee - 1 / a));

    // Circular velocity at perigee altitude (for comparison)
    const vCircular = Math.sqrt(MU_EARTH / rPerigee);

    // Ground track repeat: how many orbits per sidereal day (86164.1 s)
    const orbitsPerDay = 86164.1 / period;
    const nearestRepeat = Math.round(orbitsPerDay);

    // Specific orbital energy
    const energy = -MU_EARTH / (2 * a);

    return { period, vPerigee, vApogee, vCircular, a, rApogee, apogeeAlt, orbitsPerDay, nearestRepeat, energy };
  }, [altitude, eccentricity]);

  return (
    <div>
      <div className="card p-5 mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Orbital Period & Velocity</h3>
        <p className="text-sm text-slate-400 mb-4">
          Calculate the orbital period, velocity at perigee and apogee, and ground track repeat for an
          Earth orbit defined by perigee altitude and eccentricity.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SliderInput
              label="Perigee Altitude"
              value={altitude}
              min={160}
              max={100000}
              step={10}
              unit="km"
              onChange={setAltitude}
              logScale
              description="Altitude above Earth surface at closest approach"
            />
            <SliderInput
              label="Eccentricity"
              value={eccentricity}
              min={0}
              max={0.95}
              step={0.001}
              unit=""
              onChange={setEccentricity}
              description="0 = circular, 0.95 = highly elliptical (e.g., Molniya: ~0.74)"
            />
          </div>
          <div className="space-y-3">
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Semi-major axis</div>
              <div className="text-sm text-slate-200">{fmtNum(results.a, 1)} km</div>
            </div>
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Apogee altitude</div>
              <div className="text-sm text-slate-200">{fmtNum(results.apogeeAlt, 1)} km</div>
            </div>
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Specific orbital energy</div>
              <div className="text-sm text-slate-200">{fmtNum(results.energy, 2)} km²/s²</div>
            </div>
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Circular velocity at perigee</div>
              <div className="text-sm text-slate-200">{fmtNum(results.vCircular)} km/s</div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ResultCard label="Orbital Period" value={fmtTime(results.period)} accent="purple" />
        <ResultCard label="Velocity at Perigee" value={fmtNum(results.vPerigee)} unit="km/s" accent="cyan" />
        <ResultCard label="Velocity at Apogee" value={fmtNum(results.vApogee)} unit="km/s" accent="emerald" />
        <ResultCard label="Orbits per Day" value={fmtNum(results.orbitsPerDay, 2)} unit={`~${results.nearestRepeat} rev`} accent="amber" />
      </div>

      <div className="card p-4 mt-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Reference Orbits</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-400">
          <div><span className="text-slate-300 font-medium">ISS:</span> ~408 km, e=0.0001, T=92.7 min</div>
          <div><span className="text-slate-300 font-medium">GPS:</span> ~20,200 km, e=0.01, T=11.97 h</div>
          <div><span className="text-slate-300 font-medium">GEO:</span> ~35,786 km, e=0, T=23.93 h</div>
          <div><span className="text-slate-300 font-medium">Molniya:</span> ~500 km perigee, e=0.74, T=12 h</div>
        </div>
      </div>

      <div className="card p-4 mt-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Formulas</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          Period: T = 2 pi sqrt(a³/mu). Velocity: v = sqrt(mu * (2/r - 1/a)), where a is the semi-major axis, r is the
          radial distance, and mu = 398,600.4418 km³/s² is the Earth gravitational parameter. For an orbit defined by
          perigee altitude and eccentricity: a = r_perigee / (1 - e), r_apogee = a * (1 + e). Ground track repeat
          occurs when the orbital period is a rational fraction of a sidereal day (86,164.1 s).
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 3: Escape Velocity Calculator
// ────────────────────────────────────────

function EscapeVelocityCalculator() {
  const [body, setBody] = useState<CelestialBody>('earth');
  const [altitude, setAltitude] = useState(400);

  const results = useMemo(() => {
    const bd = BODY_DATA[body];
    const r = bd.radius + altitude;

    // Escape velocity: v_esc = sqrt(2μ/r)
    const vEscape = Math.sqrt(2 * bd.mu / r);

    // Circular orbital velocity at this altitude
    const vCircular = Math.sqrt(bd.mu / r);

    // C3 energy (characteristic energy) = v_esc² (relative to body) — for escape, C3 = 0
    // But if we want to compute C3 for a given velocity above escape:
    // C3 = v² - v_esc² ; at exactly escape, C3 = 0
    // We show the escape C3 = 0, and also the v_esc² as reference
    const c3Escape = 0; // by definition at escape velocity
    const vEscSquared = vEscape * vEscape;

    // Surface escape velocity for comparison
    const vEscSurface = Math.sqrt(2 * bd.mu / bd.radius);

    return { vEscape, vCircular, c3Escape, vEscSquared, vEscSurface, r, bodyRadius: bd.radius };
  }, [body, altitude]);

  const maxAlt = body === 'earth' ? 100000 : body === 'mars' ? 50000 : 10000;

  return (
    <div>
      <div className="card p-5 mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Escape Velocity & C3 Energy</h3>
        <p className="text-sm text-slate-400 mb-4">
          Calculate the escape velocity from a celestial body at a given altitude. The escape velocity is the
          minimum speed needed to leave the gravitational influence of the body without further propulsion.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {/* Body selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Celestial Body</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(BODY_DATA) as CelestialBody[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setBody(key); if (altitude > (key === 'moon' ? 10000 : 50000)) setAltitude(400); }}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${
                      body === key
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                        : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50'
                    }`}
                  >
                    {BODY_DATA[key].label}
                  </button>
                ))}
              </div>
            </div>
            <SliderInput
              label="Altitude"
              value={altitude}
              min={0}
              max={maxAlt}
              step={10}
              unit="km"
              onChange={setAltitude}
              logScale
              description={`Altitude above ${BODY_DATA[body].label} surface (radius: ${BODY_DATA[body].radius.toLocaleString()} km)`}
            />
          </div>
          <div className="space-y-3">
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Body radius</div>
              <div className="text-sm text-slate-200">{BODY_DATA[body].radius.toLocaleString()} km</div>
            </div>
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Radial distance from center</div>
              <div className="text-sm text-slate-200">{fmtNum(results.r, 1)} km</div>
            </div>
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Gravitational parameter (mu)</div>
              <div className="text-sm text-slate-200">{BODY_DATA[body].mu.toLocaleString()} km³/s²</div>
            </div>
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Surface escape velocity</div>
              <div className="text-sm text-slate-200">{fmtNum(results.vEscSurface)} km/s</div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ResultCard label="Escape Velocity" value={fmtNum(results.vEscape)} unit="km/s" accent="purple" />
        <ResultCard label="Circular Velocity" value={fmtNum(results.vCircular)} unit="km/s" accent="cyan" />
        <ResultCard label="C3 at Escape" value={fmtNum(results.c3Escape, 1)} unit="km²/s²" accent="emerald" />
        <ResultCard label="v_esc² (ref C3)" value={fmtNum(results.vEscSquared, 2)} unit="km²/s²" accent="amber" />
      </div>

      <div className="card p-4 mt-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">About C3 Energy</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          C3 (characteristic energy) is the square of the hyperbolic excess velocity: C3 = v² - v_escape².
          At exactly escape velocity, C3 = 0. For interplanetary missions, launch providers specify C3 capacity
          (e.g., Falcon Heavy can deliver payloads with C3 up to ~30 km²/s² for Mars trajectories). Higher C3
          means faster departure but requires more delta-v. Formula: v_escape = sqrt(2mu/r), where mu is the
          gravitational parameter and r is the distance from the body center.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 4: Atmospheric Drag & Orbital Decay
// ────────────────────────────────────────

// Simple exponential atmosphere model (scale heights for Earth)
function atmosphericDensity(altKm: number): number {
  // Piecewise exponential model based on US Standard Atmosphere 1976
  const layers: [number, number, number][] = [
    // [base altitude km, base density kg/m³, scale height km]
    [0,    1.225,        8.5],
    [100,  5.297e-7,     5.9],
    [150,  2.070e-9,     26.0],
    [200,  2.789e-10,    37.1],
    [250,  7.248e-11,    45.5],
    [300,  2.418e-11,    53.6],
    [400,  3.725e-12,    58.5],
    [500,  6.967e-13,    60.8],
    [600,  1.454e-13,    63.8],
    [700,  3.614e-14,    71.8],
    [800,  1.170e-14,    88.7],
    [900,  5.245e-15,    124.0],
    [1000, 3.019e-15,    181.0],
  ];

  // Find the appropriate layer
  let layerIdx = 0;
  for (let i = layers.length - 1; i >= 0; i--) {
    if (altKm >= layers[i][0]) {
      layerIdx = i;
      break;
    }
  }

  const [baseAlt, baseDensity, scaleHeight] = layers[layerIdx];
  return baseDensity * Math.exp(-(altKm - baseAlt) / scaleHeight);
}

function OrbitalDecayCalculator() {
  const [altitude, setAltitude] = useState(400);
  const [mass, setMass] = useState(500);
  const [area, setArea] = useState(2.0);
  const [cd, setCd] = useState(2.2);

  const results = useMemo(() => {
    const r = RE + altitude;
    const v = Math.sqrt(MU_EARTH / r) * 1000; // m/s
    const rho = atmosphericDensity(altitude); // kg/m³

    // Drag deceleration: a_drag = -0.5 * rho * v² * Cd * A / m
    const dragAccel = 0.5 * rho * v * v * cd * area / mass; // m/s²

    // Rate of altitude decrease (approximate): dh/dt ≈ -rho * Cd * A / m * pi * r * v
    // More precisely: da/dt = -rho * Cd * A / m * a * v (for circular orbit)
    const rMeters = r * 1000;
    const dailyDecay = rho * cd * area / mass * Math.PI * rMeters * v * 86400 / 1000; // m/day to m/day

    // Approximate lifetime using Gaussian quadrature-like integration
    // Simple approach: step through altitude and accumulate time
    let lifetime = 0; // seconds
    let currentAlt = altitude;
    const dtStep = 86400; // 1-day steps
    let maxIterations = 365 * 200; // cap at 200 years

    while (currentAlt > 120 && maxIterations > 0) {
      const rCurrent = (RE + currentAlt) * 1000; // meters
      const vCurrent = Math.sqrt(MU_EARTH * 1e9 / rCurrent); // m/s (convert mu to m³/s²)
      const rhoCurrent = atmosphericDensity(currentAlt);

      // Semi-major axis decay rate
      const decayRate = rhoCurrent * cd * area / mass * Math.PI * rCurrent * vCurrent; // m/s
      const altLoss = decayRate * dtStep / 1000; // km per step

      if (altLoss < 1e-10) {
        // Negligible decay — estimate remaining time as very long
        lifetime += 200 * 365.25 * 86400; // cap at 200 years
        break;
      }

      currentAlt -= altLoss;
      lifetime += dtStep;
      maxIterations--;
    }

    const lifetimeDays = lifetime / 86400;
    const lifetimeYears = lifetimeDays / 365.25;

    let lifetimeStr: string;
    if (lifetimeYears >= 100) {
      lifetimeStr = '100+ years';
    } else if (lifetimeYears >= 1) {
      lifetimeStr = `${lifetimeYears.toFixed(1)} years`;
    } else if (lifetimeDays >= 1) {
      lifetimeStr = `${lifetimeDays.toFixed(0)} days`;
    } else {
      lifetimeStr = '< 1 day';
    }

    return {
      dailyDecay: dailyDecay * 1000, // convert to mm/day if very small, keep as m/day
      dragAccel,
      rho,
      lifetimeStr,
      lifetimeYears,
      ballisticCoeff: mass / (cd * area),
    };
  }, [altitude, mass, area, cd]);

  const dailyDecayStr = results.dailyDecay >= 1
    ? `${fmtNum(results.dailyDecay, 1)} m/day`
    : `${fmtNum(results.dailyDecay * 1000, 1)} mm/day`;

  return (
    <div>
      <div className="card p-5 mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Atmospheric Drag & Orbital Decay</h3>
        <p className="text-sm text-slate-400 mb-4">
          Estimate the orbital lifetime of a satellite due to atmospheric drag. This uses a simplified exponential
          atmosphere model and assumes a circular orbit with gradual decay. Actual lifetimes depend on solar activity
          (which heats and expands the upper atmosphere) and spacecraft attitude.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SliderInput
              label="Orbit Altitude"
              value={altitude}
              min={160}
              max={1500}
              step={5}
              unit="km"
              onChange={setAltitude}
              description="Atmospheric drag is significant below ~1000 km"
            />
            <SliderInput
              label="Satellite Mass"
              value={mass}
              min={1}
              max={10000}
              step={1}
              unit="kg"
              onChange={setMass}
              logScale
              description="Dry mass of the satellite"
            />
            <SliderInput
              label="Cross-Section Area"
              value={area}
              min={0.01}
              max={100}
              step={0.01}
              unit="m²"
              onChange={setArea}
              logScale
              description="Effective cross-sectional area in the velocity direction"
            />
            <SliderInput
              label="Drag Coefficient (Cd)"
              value={cd}
              min={1.0}
              max={4.0}
              step={0.1}
              unit=""
              onChange={setCd}
              description="Typical satellite Cd = 2.0-2.5; flat plate ~2.2"
            />
          </div>
          <div className="space-y-3">
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Atmospheric Density</div>
              <div className="text-sm text-slate-200">{results.rho.toExponential(3)} kg/m³</div>
            </div>
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Drag Acceleration</div>
              <div className="text-sm text-slate-200">{results.dragAccel.toExponential(3)} m/s²</div>
            </div>
            <div className="card p-3 bg-slate-800/30">
              <div className="text-xs text-slate-500 mb-1">Ballistic Coefficient (m/CdA)</div>
              <div className="text-sm text-slate-200">{fmtNum(results.ballisticCoeff, 1)} kg/m²</div>
            </div>
            <div className="card p-4 bg-purple-500/5 border-purple-500/20">
              <div className="text-xs text-purple-400 mb-1 font-medium">Tip</div>
              <p className="text-xs text-slate-400">
                Higher ballistic coefficient = slower decay. Compact, heavy satellites last longer
                than lightweight, large-area spacecraft at the same altitude.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ResultCard label="Estimated Lifetime" value={results.lifetimeStr} accent="purple" />
        <ResultCard label="Daily Altitude Loss" value={dailyDecayStr} accent="cyan" />
        <ResultCard label="Atm. Density" value={results.rho.toExponential(2)} unit="kg/m³" accent="emerald" />
        <ResultCard label="Ballistic Coeff." value={fmtNum(results.ballisticCoeff, 1)} unit="kg/m²" accent="amber" />
      </div>

      <div className="card p-4 mt-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Limitations</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          This model uses a static exponential atmosphere approximation. Real atmospheric density varies by a
          factor of 10x or more with the 11-year solar cycle (solar maximum heats the thermosphere, increasing
          drag). The model does not account for: solar activity (F10.7 flux), geomagnetic storms, day/night
          density variations, orbit eccentricity effects, or atmospheric rotation (co-rotation). For precise
          lifetime predictions, use tools like NASA ORDEM or ESA DRAMA that incorporate dynamic atmosphere models.
          Results above ~800 km altitude should be considered very approximate.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab Icon Component
// ────────────────────────────────────────

function TabIcon({ type }: { type: string }) {
  switch (type) {
    case 'dv':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case 'pv':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'ev':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    case 'od':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    default:
      return null;
  }
}

// ────────────────────────────────────────
// Main Content (with URL tab state)
// ────────────────────────────────────────

function OrbitalCalculatorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = (searchParams.get('tab') as TabType) || 'delta-v';
  const validTab: TabType = TABS.some(t => t.id === initialTab) ? initialTab : 'delta-v';
  const [activeTab, setActiveTab] = useState<TabType>(validTab);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'delta-v') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-700/50 pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
              activeTab === tab.id
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50 hover:text-slate-300'
            }`}
          >
            <TabIcon type={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'delta-v' && <DeltaVCalculator />}
      {activeTab === 'period' && <PeriodVelocityCalculator />}
      {activeTab === 'escape' && <EscapeVelocityCalculator />}
      {activeTab === 'decay' && <OrbitalDecayCalculator />}

      {/* Related Links */}
      <div className="card p-5 mt-8 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-4">Related Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/launch-cost-calculator"
            className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-200">
              Launch Cost Calculator
            </div>
            <p className="text-xs text-slate-400 mt-1">Estimate satellite launch costs</p>
          </Link>
          <Link
            href="/mission-cost"
            className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-200">
              Mission Cost Estimator
            </div>
            <p className="text-xs text-slate-400 mt-1">Full mission cost breakdown</p>
          </Link>
          <Link
            href="/launch-windows"
            className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-200">
              Launch Windows
            </div>
            <p className="text-xs text-slate-400 mt-1">Optimal launch timing</p>
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
    </div>
  );
}

// ────────────────────────────────────────
// Page Export (with Suspense boundary)
// ────────────────────────────────────────

export default function OrbitalCalculatorPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500 mb-4">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/mission-cost" className="hover:text-slate-300 transition-colors">Mission Planning</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-400">Orbital Calculator</span>
        </nav>

        <AnimatedPageHeader
          title="Orbital Mechanics Calculator"
          subtitle="Calculate delta-v, orbital periods, escape velocities, and satellite lifetimes with physically accurate formulas"
          accentColor="purple"
        />

        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <OrbitalCalculatorContent />
        </Suspense>
      </div>
    </div>
  );
}
