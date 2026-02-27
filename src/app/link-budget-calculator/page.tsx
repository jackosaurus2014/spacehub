'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Constants & Types
// ────────────────────────────────────────

const C = 299792458; // speed of light m/s
const K_DBW = -228.6; // Boltzmann constant in dBW/K/Hz

type FrequencyBand = 'UHF' | 'S' | 'X' | 'Ku' | 'Ka';
type Modulation = 'BPSK' | 'QPSK' | '8PSK' | '16QAM';

interface BandInfo {
  label: string;
  freqGHz: number;
  atmosphericLoss: number; // dB typical clear-sky
  rainAttenuation: number; // dB typical heavy rain
}

const BANDS: Record<FrequencyBand, BandInfo> = {
  UHF: { label: 'UHF (400 MHz)',    freqGHz: 0.4,   atmosphericLoss: 0.5, rainAttenuation: 0.2 },
  S:   { label: 'S-band (2.2 GHz)', freqGHz: 2.2,   atmosphericLoss: 0.5, rainAttenuation: 0.5 },
  X:   { label: 'X-band (8.2 GHz)', freqGHz: 8.2,   atmosphericLoss: 0.8, rainAttenuation: 2.0 },
  Ku:  { label: 'Ku-band (14 GHz)', freqGHz: 14.0,  atmosphericLoss: 1.2, rainAttenuation: 4.0 },
  Ka:  { label: 'Ka-band (26.5 GHz)', freqGHz: 26.5, atmosphericLoss: 2.0, rainAttenuation: 8.0 },
};

const MODULATIONS: Record<Modulation, { label: string; requiredEbN0: number }> = {
  BPSK:  { label: 'BPSK',   requiredEbN0: 9.6 },
  QPSK:  { label: 'QPSK',   requiredEbN0: 9.6 },
  '8PSK':  { label: '8PSK',   requiredEbN0: 13.0 },
  '16QAM': { label: '16QAM',  requiredEbN0: 14.5 },
};

interface Preset {
  label: string;
  description: string;
  txPower: number;
  txGain: number;
  txLoss: number;
  band: FrequencyBand;
  slantRange: number;
  rainEnabled: boolean;
  rainAtten: number;
  pointingLoss: number;
  rxGain: number;
  noiseTemp: number;
  rxLoss: number;
  dataRate: number;
  modulation: Modulation;
}

const PRESETS: Preset[] = [
  {
    label: 'LEO Earth Observation',
    description: 'S-band downlink, 500 km, 5W, 10 Mbps',
    txPower: 5, txGain: 6, txLoss: 1,
    band: 'S', slantRange: 500, rainEnabled: false, rainAtten: 0, pointingLoss: 0.5,
    rxGain: 34, noiseTemp: 290, rxLoss: 1, dataRate: 10000, modulation: 'QPSK',
  },
  {
    label: 'GEO Comms Satellite',
    description: 'Ku-band, 36,000 km, 50W, 100 Mbps',
    txPower: 50, txGain: 30, txLoss: 1.5,
    band: 'Ku', slantRange: 36000, rainEnabled: true, rainAtten: 3, pointingLoss: 0.3,
    rxGain: 45, noiseTemp: 200, rxLoss: 1, dataRate: 100000, modulation: 'QPSK',
  },
  {
    label: 'Deep Space Probe',
    description: 'X-band, ~1 AU, 20W, 1 kbps',
    txPower: 20, txGain: 36, txLoss: 0.5,
    band: 'X', slantRange: 40000, rainEnabled: false, rainAtten: 0, pointingLoss: 0.1,
    rxGain: 50, noiseTemp: 150, rxLoss: 0.5, dataRate: 1, modulation: 'BPSK',
  },
  {
    label: 'CubeSat UHF',
    description: 'UHF 400 MHz, 500 km, 1W, 9.6 kbps',
    txPower: 1, txGain: 2, txLoss: 0.5,
    band: 'UHF', slantRange: 500, rainEnabled: false, rainAtten: 0, pointingLoss: 1.0,
    rxGain: 18, noiseTemp: 400, rxLoss: 1, dataRate: 9.6, modulation: 'BPSK',
  },
];

// ────────────────────────────────────────
// Utility Functions
// ────────────────────────────────────────

function wToDbw(watts: number): number {
  return 10 * Math.log10(watts);
}

function fmtDb(val: number, decimals = 2): string {
  return val.toFixed(decimals);
}

function formatDataRate(kbps: number): string {
  if (kbps >= 1000000) return `${(kbps / 1000000).toFixed(1)} Gbps`;
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${kbps.toFixed(1)} kbps`;
}

function fspl(distKm: number, freqGHz: number): number {
  // FSPL = 20*log10(4*pi*d*f/c), d in meters, f in Hz
  const dMeters = distKm * 1000;
  const fHz = freqGHz * 1e9;
  return 20 * Math.log10((4 * Math.PI * dMeters * fHz) / C);
}

// ────────────────────────────────────────
// Slider Input Component
// ────────────────────────────────────────

function SliderInput({
  label, value, min, max, step, unit, onChange, description, logScale = false,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void; description?: string; logScale?: boolean;
}) {
  const sliderVal = logScale ? Math.log10(Math.max(value, min > 0 ? min : 0.001)) : value;
  const sliderMin = logScale ? Math.log10(Math.max(min, 0.001)) : min;
  const sliderMax = logScale ? Math.log10(max) : max;
  const sliderStep = logScale ? 0.01 : step;

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (logScale) {
      const actual = Math.pow(10, raw);
      // Round to reasonable precision
      const rounded = actual >= 100 ? Math.round(actual) : actual >= 1 ? parseFloat(actual.toFixed(1)) : parseFloat(actual.toFixed(3));
      onChange(rounded);
    } else {
      onChange(parseFloat(parseFloat(e.target.value).toFixed(6)));
    }
  }, [logScale, onChange]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= min && val <= max) onChange(val);
  }, [min, max, onChange]);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="flex items-center gap-3 mb-1.5">
        <input
          type="number"
          min={min} max={max} step={step} value={value}
          onChange={handleInput}
          className="w-28 bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
        />
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
      <input
        type="range"
        min={sliderMin} max={sliderMax} step={sliderStep} value={sliderVal}
        onChange={handleSlider}
        className="w-full h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-cyan-500 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
      />
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

// ────────────────────────────────────────
// Result Card Component
// ────────────────────────────────────────

function ResultCard({ label, value, unit, accent = 'cyan' }: {
  label: string; value: string; unit?: string;
  accent?: 'cyan' | 'emerald' | 'amber' | 'purple' | 'red' | 'yellow' | 'green';
}) {
  const colors: Record<string, string> = {
    cyan: 'text-cyan-400', emerald: 'text-emerald-400', amber: 'text-amber-400',
    purple: 'text-purple-400', red: 'text-red-400', yellow: 'text-yellow-400', green: 'text-green-400',
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
// Margin Indicator
// ────────────────────────────────────────

function MarginIndicator({ margin }: { margin: number }) {
  let color: string;
  let label: string;
  let bgColor: string;
  if (margin > 3) {
    color = 'text-emerald-400';
    bgColor = 'bg-emerald-500/10 border-emerald-500/30';
    label = 'Healthy Link';
  } else if (margin >= 0) {
    color = 'text-yellow-400';
    bgColor = 'bg-yellow-500/10 border-yellow-500/30';
    label = 'Marginal Link';
  } else {
    color = 'text-red-400';
    bgColor = 'bg-red-500/10 border-red-500/30';
    label = 'Link Fails';
  }

  const barWidth = Math.min(Math.max((margin + 10) / 30 * 100, 0), 100);

  return (
    <div className={`card p-5 border ${bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Link Margin</div>
          <div className={`text-3xl font-bold ${color}`}>{fmtDb(margin)} dB</div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${bgColor} ${color} border`}>
          {label}
        </div>
      </div>
      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            margin > 3 ? 'bg-emerald-500' : margin >= 0 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>-10 dB</span>
        <span className="text-slate-500">0 dB</span>
        <span>+20 dB</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function LinkBudgetCalculatorPage() {
  // Transmitter state
  const [txPower, setTxPower] = useState(5);         // Watts
  const [txGain, setTxGain] = useState(6);            // dBi
  const [txLoss, setTxLoss] = useState(1);            // dB

  // Path state
  const [band, setBand] = useState<FrequencyBand>('S');
  const [slantRange, setSlantRange] = useState(500);  // km
  const [rainEnabled, setRainEnabled] = useState(false);
  const [rainAtten, setRainAtten] = useState(0);      // dB
  const [pointingLoss, setPointingLoss] = useState(0.5); // dB

  // Receiver state
  const [rxGain, setRxGain] = useState(34);           // dBi
  const [noiseTemp, setNoiseTemp] = useState(290);     // K
  const [rxLoss, setRxLoss] = useState(1);             // dB

  // Link budget state
  const [dataRate, setDataRate] = useState(10000);     // kbps
  const [modulation, setModulation] = useState<Modulation>('QPSK');

  // Apply preset
  const applyPreset = useCallback((p: Preset) => {
    setTxPower(p.txPower); setTxGain(p.txGain); setTxLoss(p.txLoss);
    setBand(p.band); setSlantRange(p.slantRange);
    setRainEnabled(p.rainEnabled); setRainAtten(p.rainAtten);
    setPointingLoss(p.pointingLoss);
    setRxGain(p.rxGain); setNoiseTemp(p.noiseTemp); setRxLoss(p.rxLoss);
    setDataRate(p.dataRate); setModulation(p.modulation);
  }, []);

  // ── Calculations ──
  const results = useMemo(() => {
    const bandInfo = BANDS[band];

    // Transmitter
    const txPowerDbw = wToDbw(txPower);
    const eirp = txPowerDbw + txGain - txLoss;

    // Path losses
    const freeSpaceLoss = fspl(slantRange, bandInfo.freqGHz);
    const atmLoss = bandInfo.atmosphericLoss;
    const rainLoss = rainEnabled ? rainAtten : 0;
    const totalPathLoss = freeSpaceLoss + atmLoss + rainLoss + pointingLoss;

    // Receiver
    const gOverT = rxGain - 10 * Math.log10(noiseTemp); // dB/K

    // Link budget
    // C/N0 = EIRP + G/T - FSPL - atm_loss - rain_loss - pointing_loss - rx_loss - k
    const cn0 = eirp + gOverT - freeSpaceLoss - atmLoss - rainLoss - pointingLoss - rxLoss - K_DBW;

    // Eb/N0 = C/N0 - 10*log10(data_rate_bps)
    const dataRateBps = dataRate * 1000;
    const ebN0 = cn0 - 10 * Math.log10(dataRateBps);

    // Required Eb/N0 and margin
    const requiredEbN0 = MODULATIONS[modulation].requiredEbN0;
    const linkMargin = ebN0 - requiredEbN0;

    return {
      txPowerDbw, eirp,
      freeSpaceLoss, atmLoss, rainLoss, totalPathLoss,
      gOverT,
      cn0, ebN0, requiredEbN0, linkMargin,
    };
  }, [txPower, txGain, txLoss, band, slantRange, rainEnabled, rainAtten, pointingLoss, rxGain, noiseTemp, rxLoss, dataRate, modulation]);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <ScrollReveal>
        <nav className="text-sm text-slate-500 mb-4">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/satellites" className="hover:text-slate-300 transition-colors">Space Operations</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-400">Link Budget Calculator</span>
        </nav>
        </ScrollReveal>

        <AnimatedPageHeader
          title="Communications Link Budget Calculator"
          subtitle="Analyze satellite-to-ground communication links with complete transmitter, path, and receiver calculations"
          accentColor="cyan"
        />

        {/* Quick Presets */}
        <ScrollReveal>
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Presets</h3>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <StaggerItem key={p.label}>
              <button
                onClick={() => applyPreset(p)}
                className="w-full text-left p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all"
              >
                <div className="text-sm font-medium text-slate-200">{p.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
              </button>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
        </ScrollReveal>

        {/* Link Margin Overview */}
        <div className="mb-6">
          <MarginIndicator margin={results.linkMargin} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* ── Transmitter Section ── */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-100 mb-1 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              Transmitter
            </h3>
            <p className="text-xs text-slate-500 mb-4">Satellite or spacecraft transmitter parameters</p>

            <SliderInput
              label="Transmit Power"
              value={txPower} min={0.1} max={100} step={0.1} unit="W"
              onChange={setTxPower} logScale
              description={`= ${fmtDb(wToDbw(txPower))} dBW (${fmtDb(wToDbw(txPower) + 30)} dBm)`}
            />
            <SliderInput
              label="Transmit Antenna Gain"
              value={txGain} min={0} max={40} step={0.1} unit="dBi"
              onChange={setTxGain}
              description="Antenna directional gain (dipole ~2 dBi, patch ~6 dBi, dish ~30+ dBi)"
            />
            <SliderInput
              label="Transmit Losses (cable, connector)"
              value={txLoss} min={0} max={5} step={0.1} unit="dB"
              onChange={setTxLoss}
              description="Losses between transmitter and antenna"
            />

            <div className="card p-3 bg-cyan-500/5 border-cyan-500/20 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">EIRP (Effective Isotropic Radiated Power)</span>
                <span className="text-sm font-bold text-cyan-400">{fmtDb(results.eirp)} dBW</span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                = {fmtDb(wToDbw(txPower))} dBW + {fmtDb(txGain)} dBi - {fmtDb(txLoss)} dB
              </div>
            </div>
          </div>

          {/* ── Path Section ── */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-100 mb-1 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Signal Path
            </h3>
            <p className="text-xs text-slate-500 mb-4">Propagation path between satellite and ground station</p>

            {/* Frequency band selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Frequency Band</label>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(BANDS) as FrequencyBand[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setBand(key)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-all border ${
                      band === key
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                        : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50'
                    }`}
                  >
                    {key}
                    <div className="text-[10px] opacity-60">{BANDS[key].freqGHz} GHz</div>
                  </button>
                ))}
              </div>
            </div>

            <SliderInput
              label="Slant Range (satellite to ground station)"
              value={slantRange} min={300} max={40000} step={10} unit="km"
              onChange={setSlantRange} logScale
              description="LEO ~500 km, MEO ~20,000 km, GEO ~36,000 km"
            />

            <div className="card p-3 bg-slate-800/30 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Free Space Path Loss</span>
                <span className="text-amber-400 font-medium">{fmtDb(results.freeSpaceLoss)} dB</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-slate-500">Atmospheric Loss (clear sky)</span>
                <span className="text-amber-400 font-medium">{fmtDb(results.atmLoss)} dB</span>
              </div>
            </div>

            {/* Rain toggle */}
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setRainEnabled(!rainEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  rainEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  rainEnabled ? 'left-5' : 'left-0.5'
                }`} />
              </button>
              <span className="text-sm text-slate-300">Rain Attenuation</span>
            </div>
            {rainEnabled && (
              <SliderInput
                label="Rain Attenuation"
                value={rainAtten} min={0} max={10} step={0.1} unit="dB"
                onChange={setRainAtten}
                description={`Typical heavy rain for ${BANDS[band].label}: ~${BANDS[band].rainAttenuation} dB`}
              />
            )}

            <SliderInput
              label="Pointing Loss"
              value={pointingLoss} min={0} max={3} step={0.1} unit="dB"
              onChange={setPointingLoss}
              description="Antenna misalignment loss"
            />

            <div className="card p-3 bg-amber-500/5 border-amber-500/20 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Total Path Loss</span>
                <span className="text-sm font-bold text-amber-400">{fmtDb(results.totalPathLoss)} dB</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* ── Receiver Section ── */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-100 mb-1 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Receiver (Ground Station)
            </h3>
            <p className="text-xs text-slate-500 mb-4">Ground station or receiving terminal parameters</p>

            <SliderInput
              label="Receive Antenna Gain"
              value={rxGain} min={0} max={50} step={0.1} unit="dBi"
              onChange={setRxGain}
              description="Small dish ~20 dBi, large dish ~40+ dBi, DSN 70m ~74 dBi"
            />
            <SliderInput
              label="System Noise Temperature"
              value={noiseTemp} min={100} max={1000} step={1} unit="K"
              onChange={setNoiseTemp}
              description="Cooled LNA ~100K, typical ground station ~200-400K"
            />
            <SliderInput
              label="Receive Losses"
              value={rxLoss} min={0} max={5} step={0.1} unit="dB"
              onChange={setRxLoss}
              description="Feed, cable, and implementation losses"
            />

            <div className="card p-3 bg-emerald-500/5 border-emerald-500/20 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">G/T (Figure of Merit)</span>
                <span className="text-sm font-bold text-emerald-400">{fmtDb(results.gOverT)} dB/K</span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                = {fmtDb(rxGain, 1)} dBi - 10 log10({noiseTemp} K) = {fmtDb(rxGain, 1)} - {fmtDb(10 * Math.log10(noiseTemp))}
              </div>
            </div>
          </div>

          {/* ── Data Link Settings ── */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-100 mb-1 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              Data Link Configuration
            </h3>
            <p className="text-xs text-slate-500 mb-4">Data rate and modulation scheme</p>

            <SliderInput
              label="Data Rate"
              value={dataRate} min={1} max={1000000} step={1} unit="kbps"
              onChange={setDataRate} logScale
              description={`= ${formatDataRate(dataRate)}`}
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Modulation Scheme</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(MODULATIONS) as Modulation[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setModulation(key)}
                    className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all border ${
                      modulation === key
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                        : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50'
                    }`}
                  >
                    {MODULATIONS[key].label}
                    <div className="text-[10px] opacity-60">Req: {MODULATIONS[key].requiredEbN0} dB</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <div className="card p-3 bg-purple-500/5 border-purple-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">C/N&#8320; (Carrier-to-Noise Density)</span>
                  <span className="text-sm font-bold text-purple-400">{fmtDb(results.cn0)} dB-Hz</span>
                </div>
              </div>
              <div className="card p-3 bg-purple-500/5 border-purple-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Eb/N&#8320; (Actual)</span>
                  <span className="text-sm font-bold text-purple-400">{fmtDb(results.ebN0)} dB</span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  = C/N&#8320; - 10 log10({(dataRate * 1000).toLocaleString()} bps)
                </div>
              </div>
              <div className="card p-3 bg-slate-800/30">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Required Eb/N&#8320; ({modulation})</span>
                  <span className="text-sm font-medium text-slate-300">{fmtDb(results.requiredEbN0)} dB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary Results ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <ResultCard label="EIRP" value={fmtDb(results.eirp)} unit="dBW" accent="cyan" />
          <ResultCard label="Free Space Path Loss" value={fmtDb(results.freeSpaceLoss)} unit="dB" accent="amber" />
          <ResultCard label="G/T" value={fmtDb(results.gOverT)} unit="dB/K" accent="emerald" />
          <ResultCard
            label="Link Margin"
            value={fmtDb(results.linkMargin)}
            unit="dB"
            accent={results.linkMargin > 3 ? 'green' : results.linkMargin >= 0 ? 'yellow' : 'red'}
          />
        </div>

        {/* ── Detailed Breakdown ── */}
        <div className="card p-5 mb-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Detailed Link Budget Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
                  <th className="text-left py-2 pr-4">Parameter</th>
                  <th className="text-right py-2 px-4">Value</th>
                  <th className="text-right py-2 pl-4">Linear</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">Transmit Power</td>
                  <td className="py-2 px-4 text-right text-cyan-400">{fmtDb(wToDbw(txPower))} dBW</td>
                  <td className="py-2 pl-4 text-right text-slate-500">{txPower} W</td>
                </tr>
                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">Transmit Antenna Gain</td>
                  <td className="py-2 px-4 text-right text-cyan-400">+{fmtDb(txGain)} dBi</td>
                  <td className="py-2 pl-4 text-right text-slate-500">{fmtDb(Math.pow(10, txGain / 10), 1)}x</td>
                </tr>
                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">Transmit Losses</td>
                  <td className="py-2 px-4 text-right text-red-400">-{fmtDb(txLoss)} dB</td>
                  <td className="py-2 pl-4 text-right text-slate-500"></td>
                </tr>
                <tr className="border-b border-slate-700/50 font-medium">
                  <td className="py-2 pr-4 text-slate-200">EIRP</td>
                  <td className="py-2 px-4 text-right text-cyan-400">{fmtDb(results.eirp)} dBW</td>
                  <td className="py-2 pl-4 text-right text-slate-500">{fmtDb(Math.pow(10, results.eirp / 10), 2)} W</td>
                </tr>

                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">Free Space Path Loss</td>
                  <td className="py-2 px-4 text-right text-red-400">-{fmtDb(results.freeSpaceLoss)} dB</td>
                  <td className="py-2 pl-4 text-right text-slate-500">{BANDS[band].freqGHz} GHz, {slantRange.toLocaleString()} km</td>
                </tr>
                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">Atmospheric Loss</td>
                  <td className="py-2 px-4 text-right text-red-400">-{fmtDb(results.atmLoss)} dB</td>
                  <td className="py-2 pl-4 text-right text-slate-500">Clear sky estimate</td>
                </tr>
                {rainEnabled && (
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2 pr-4 text-slate-400">Rain Attenuation</td>
                    <td className="py-2 px-4 text-right text-red-400">-{fmtDb(results.rainLoss)} dB</td>
                    <td className="py-2 pl-4 text-right text-slate-500">User-specified</td>
                  </tr>
                )}
                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">Pointing Loss</td>
                  <td className="py-2 px-4 text-right text-red-400">-{fmtDb(pointingLoss)} dB</td>
                  <td className="py-2 pl-4 text-right text-slate-500">Antenna misalignment</td>
                </tr>

                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">Receive Antenna Gain</td>
                  <td className="py-2 px-4 text-right text-emerald-400">+{fmtDb(rxGain)} dBi</td>
                  <td className="py-2 pl-4 text-right text-slate-500">{fmtDb(Math.pow(10, rxGain / 10), 1)}x</td>
                </tr>
                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">Receive Losses</td>
                  <td className="py-2 px-4 text-right text-red-400">-{fmtDb(rxLoss)} dB</td>
                  <td className="py-2 pl-4 text-right text-slate-500"></td>
                </tr>
                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">System Noise Temperature</td>
                  <td className="py-2 px-4 text-right text-slate-300">-{fmtDb(10 * Math.log10(noiseTemp))} dB-K</td>
                  <td className="py-2 pl-4 text-right text-slate-500">{noiseTemp} K</td>
                </tr>
                <tr className="border-b border-slate-700/50 font-medium">
                  <td className="py-2 pr-4 text-slate-200">G/T (Figure of Merit)</td>
                  <td className="py-2 px-4 text-right text-emerald-400">{fmtDb(results.gOverT)} dB/K</td>
                  <td className="py-2 pl-4 text-right text-slate-500"></td>
                </tr>

                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">Boltzmann Constant (k)</td>
                  <td className="py-2 px-4 text-right text-emerald-400">+228.60 dBW/K/Hz</td>
                  <td className="py-2 pl-4 text-right text-slate-500">1.38 x 10&#8315;&#178;&#179; W/K/Hz</td>
                </tr>

                <tr className="border-b border-slate-700/50 font-medium">
                  <td className="py-2 pr-4 text-slate-200">C/N&#8320;</td>
                  <td className="py-2 px-4 text-right text-purple-400">{fmtDb(results.cn0)} dB-Hz</td>
                  <td className="py-2 pl-4 text-right text-slate-500">Carrier-to-noise density</td>
                </tr>
                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">Data Rate</td>
                  <td className="py-2 px-4 text-right text-slate-300">-{fmtDb(10 * Math.log10(dataRate * 1000))} dB-bps</td>
                  <td className="py-2 pl-4 text-right text-slate-500">{formatDataRate(dataRate)}</td>
                </tr>
                <tr className="border-b border-slate-700/50 font-medium">
                  <td className="py-2 pr-4 text-slate-200">Eb/N&#8320; (Actual)</td>
                  <td className="py-2 px-4 text-right text-purple-400">{fmtDb(results.ebN0)} dB</td>
                  <td className="py-2 pl-4 text-right text-slate-500"></td>
                </tr>
                <tr className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-400">Required Eb/N&#8320; ({modulation})</td>
                  <td className="py-2 px-4 text-right text-slate-300">{fmtDb(results.requiredEbN0)} dB</td>
                  <td className="py-2 pl-4 text-right text-slate-500">BER = 10&#8315;&#8310;</td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-2 pr-4 text-white">Link Margin</td>
                  <td className={`py-2 px-4 text-right font-bold ${
                    results.linkMargin > 3 ? 'text-emerald-400' : results.linkMargin >= 0 ? 'text-yellow-400' : 'text-red-400'
                  }`}>{fmtDb(results.linkMargin)} dB</td>
                  <td className={`py-2 pl-4 text-right text-sm ${
                    results.linkMargin > 3 ? 'text-emerald-500' : results.linkMargin >= 0 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {results.linkMargin > 3 ? 'Healthy' : results.linkMargin >= 0 ? 'Marginal' : 'LINK FAILS'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Formulas Reference ── */}
        <ScrollReveal delay={0.1}>
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Link Budget Equations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500 leading-relaxed">
            <div>
              <p className="text-slate-400 font-medium mb-1">EIRP (dBW)</p>
              <p>= P_tx (dBW) + G_tx (dBi) - L_tx (dB)</p>
              <p className="text-slate-400 font-medium mb-1 mt-3">Free Space Path Loss (dB)</p>
              <p>= 20 log10(4 pi d f / c), where d = distance (m), f = frequency (Hz)</p>
              <p className="text-slate-400 font-medium mb-1 mt-3">G/T (dB/K)</p>
              <p>= G_rx (dBi) - 10 log10(T_sys) (K)</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">C/N0 (dB-Hz)</p>
              <p>= EIRP + G/T - FSPL - L_atm - L_rain - L_point - L_rx - k</p>
              <p className="mt-1">where k = -228.6 dBW/K/Hz (Boltzmann constant)</p>
              <p className="text-slate-400 font-medium mb-1 mt-3">Eb/N0 (dB)</p>
              <p>= C/N0 - 10 log10(R), where R = data rate (bps)</p>
              <p className="text-slate-400 font-medium mb-1 mt-3">Link Margin (dB)</p>
              <p>= Eb/N0 (actual) - Eb/N0 (required)</p>
            </div>
          </div>
        </div>
        </ScrollReveal>

        {/* ── Related Links ── */}
        <ScrollReveal delay={0.2}>
        <div className="card p-5 border border-cyan-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Related Tools</h3>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StaggerItem>
            <Link href="/orbital-calculator" className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
              <div className="text-sm font-medium text-white group-hover:text-cyan-200">Orbital Calculator</div>
              <p className="text-xs text-slate-400 mt-1">Delta-v, periods, escape velocity</p>
            </Link>
            </StaggerItem>
            <StaggerItem>
            <Link href="/satellites" className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
              <div className="text-sm font-medium text-white group-hover:text-cyan-200">Satellite Tracker</div>
              <p className="text-xs text-slate-400 mt-1">Track objects in orbit</p>
            </Link>
            </StaggerItem>
            <StaggerItem>
            <Link href="/spectrum" className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
              <div className="text-sm font-medium text-white group-hover:text-cyan-200">Spectrum Management</div>
              <p className="text-xs text-slate-400 mt-1">Frequency allocation and planning</p>
            </Link>
            </StaggerItem>
            <StaggerItem>
            <Link href="/spaceports" className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
              <div className="text-sm font-medium text-white group-hover:text-cyan-200">Ground Stations</div>
              <p className="text-xs text-slate-400 mt-1">Spaceports and communications</p>
            </Link>
            </StaggerItem>
          </StaggerContainer>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
