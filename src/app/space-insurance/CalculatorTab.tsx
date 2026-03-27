'use client';

import { useState } from 'react';
import ScrollReveal from '@/components/ui/ScrollReveal';

// ── Types ──

interface CalculatorInputs {
  orbitType: 'LEO' | 'GEO' | 'MEO' | 'deep_space';
  satelliteValue: number;
  launchVehicle: string;
  missionDuration: number;
  isNewDesign: boolean;
  hasHeritage: boolean;
}

interface PremiumBreakdown {
  launchRisk: number;
  inOrbitRisk: number;
  thirdPartyLiability: number;
  totalPremium: number;
  effectiveRate: number;
}

// ── Static data ──

const ORBIT_RISK_FACTORS: Record<string, { label: string; launchRate: number; inOrbitRate: number; liabilityRate: number; description: string }> = {
  LEO: { label: 'Low Earth Orbit (LEO)', launchRate: 6.5, inOrbitRate: 2.8, liabilityRate: 1.2, description: '200-2,000 km altitude. Higher debris risk but lower launch energy.' },
  MEO: { label: 'Medium Earth Orbit (MEO)', launchRate: 7.5, inOrbitRate: 3.2, liabilityRate: 1.5, description: '2,000-35,786 km. Navigation constellations (GPS, Galileo).' },
  GEO: { label: 'Geostationary Orbit (GEO)', launchRate: 9.0, inOrbitRate: 4.5, liabilityRate: 2.0, description: '35,786 km altitude. Higher launch risk, longer mission life.' },
  deep_space: { label: 'Deep Space / Lunar', launchRate: 14.0, inOrbitRate: 8.0, liabilityRate: 3.5, description: 'Beyond GEO. Highest risk profile, limited heritage data.' },
};

const LAUNCH_VEHICLES: { name: string; reliability: number; riskMultiplier: number; flights: number }[] = [
  { name: 'Falcon 9 (SpaceX)', reliability: 99.3, riskMultiplier: 0.85, flights: 350 },
  { name: 'Falcon Heavy (SpaceX)', reliability: 100, riskMultiplier: 0.90, flights: 10 },
  { name: 'Ariane 6 (Arianespace)', reliability: 95.0, riskMultiplier: 1.10, flights: 3 },
  { name: 'Atlas V (ULA)', reliability: 100, riskMultiplier: 0.80, flights: 101 },
  { name: 'Vulcan Centaur (ULA)', reliability: 100, riskMultiplier: 1.05, flights: 3 },
  { name: 'Electron (Rocket Lab)', reliability: 96.0, riskMultiplier: 0.95, flights: 55 },
  { name: 'Neutron (Rocket Lab)', reliability: 0, riskMultiplier: 1.50, flights: 0 },
  { name: 'H3 (JAXA/MHI)', reliability: 90.0, riskMultiplier: 1.10, flights: 3 },
  { name: 'Long March 5 (CASC)', reliability: 92.0, riskMultiplier: 1.05, flights: 15 },
  { name: 'PSLV (ISRO)', reliability: 96.2, riskMultiplier: 0.95, flights: 62 },
  { name: 'New Glenn (Blue Origin)', reliability: 90.0, riskMultiplier: 1.20, flights: 1 },
  { name: 'Starship (SpaceX)', reliability: 0, riskMultiplier: 1.50, flights: 7 },
  { name: 'Other / Unspecified', reliability: 90.0, riskMultiplier: 1.25, flights: 0 },
];

const PREMIUM_RATE_BENCHMARKS: { type: string; label: string; icon: string; baseRate: number; riskMultiplier: number; effectiveRate: number; description: string }[] = [
  { type: 'launch', label: 'Launch', icon: '\u{1F680}', baseRate: 8.5, riskMultiplier: 1.0, effectiveRate: 8.5, description: 'Pre-launch through orbit injection. Highest risk window covering ascent, separation, and early operations.' },
  { type: 'in_orbit', label: 'In-Orbit', icon: '\u{1F6F0}\u{FE0F}', baseRate: 5.5, riskMultiplier: 0.8, effectiveRate: 4.4, description: 'Operational phase coverage for on-station satellites including power, propulsion, and payload subsystems.' },
  { type: 'liability', label: 'Liability', icon: '\u{2696}\u{FE0F}', baseRate: 3.0, riskMultiplier: 0.6, effectiveRate: 1.8, description: 'Third-party liability for launch and operations as required by national licensing authorities.' },
  { type: 'third_party', label: 'Third Party', icon: '\u{1F465}', baseRate: 2.5, riskMultiplier: 0.5, effectiveRate: 1.25, description: 'Coverage for damage to third-party property or persons from launch debris or re-entry.' },
  { type: 'ground', label: 'Ground Risk', icon: '\u{1F3D7}\u{FE0F}', baseRate: 1.8, riskMultiplier: 0.4, effectiveRate: 0.72, description: 'Pre-launch ground segment coverage including assembly, integration, testing, and transport.' },
];

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}B`;
  if (value >= 1) return `$${value.toFixed(1)}M`;
  return `$${(value * 1000).toFixed(0)}K`;
}

// ── Props ──

interface CalculatorTabProps {
  calcInputs: CalculatorInputs;
  setCalcInputs: React.Dispatch<React.SetStateAction<CalculatorInputs>>;
  calcResult: PremiumBreakdown;
  insurerEstimates: { insurer: string; premium: number; rate: number; notes: string }[];
}

export default function CalculatorTab({ calcInputs, setCalcInputs, calcResult, insurerEstimates }: CalculatorTabProps) {
  const [showInsurerComparison, setShowInsurerComparison] = useState(false);

  return (
    <div className="space-y-6">
      {/* Interactive Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <ScrollReveal>
          <div className="card-elevated p-6 border border-white/15">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{'\u{1F9EE}'}</span>
              <div>
                <h3 className="text-lg font-semibold text-white">Insurance Premium Calculator</h3>
                <p className="text-slate-400 text-sm">Configure your mission parameters to estimate insurance costs</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Orbit Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Mission Orbit Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ORBIT_RISK_FACTORS) as Array<keyof typeof ORBIT_RISK_FACTORS>).map((key) => (
                    <button
                      key={key}
                      onClick={() => setCalcInputs((prev) => ({ ...prev, orbitType: key as CalculatorInputs['orbitType'] }))}
                      className={`p-3 rounded-lg text-left text-sm transition-all ${
                        calcInputs.orbitType === key
                          ? 'bg-white/10 border border-white/15 text-slate-900'
                          : 'bg-white/[0.06] border border-white/[0.06] text-slate-400 hover:border-white/[0.1]'
                      }`}
                    >
                      <div className="font-medium">{key === 'deep_space' ? 'Deep Space' : key}</div>
                      <div className="text-xs mt-0.5 opacity-75">{ORBIT_RISK_FACTORS[key].description.split('.')[0]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Satellite Value Slider */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Satellite / Payload Value: <span className="text-white/90 font-bold">{formatCurrency(calcInputs.satelliteValue)}</span>
                </label>
                <input type="range" min={1} max={1000} step={1} value={calcInputs.satelliteValue}
                  onChange={(e) => setCalcInputs((prev) => ({ ...prev, satelliteValue: Number(e.target.value) }))}
                  className="w-full h-2 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-slate-400"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>$1M</span><span>$250M</span><span>$500M</span><span>$750M</span><span>$1B</span>
                </div>
              </div>

              {/* Launch Vehicle */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Launch Vehicle</label>
                <select value={calcInputs.launchVehicle}
                  onChange={(e) => setCalcInputs((prev) => ({ ...prev, launchVehicle: e.target.value }))}
                  className="w-full bg-white/[0.08] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/15 transition-colors"
                >
                  {LAUNCH_VEHICLES.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.reliability > 0 ? `${v.reliability}% reliability, ` : ''}{v.flights > 0 ? `${v.flights} ${v.reliability === 0 ? 'test ' : ''}flights` : 'In development'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mission Duration */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mission Duration: <span className="text-white/90 font-bold">{calcInputs.missionDuration} years</span>
                </label>
                <input type="range" min={1} max={25} step={1} value={calcInputs.missionDuration}
                  onChange={(e) => setCalcInputs((prev) => ({ ...prev, missionDuration: Number(e.target.value) }))}
                  className="w-full h-2 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-slate-400"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1 yr</span><span>5 yr</span><span>10 yr</span><span>15 yr</span><span>20 yr</span><span>25 yr</span>
                </div>
              </div>

              {/* Toggle Options */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setCalcInputs((prev) => ({ ...prev, isNewDesign: !prev.isNewDesign }))}
                  className={`p-3 rounded-lg text-sm text-left transition-all ${calcInputs.isNewDesign ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : 'bg-white/[0.06] border border-white/[0.06] text-slate-400'}`}
                >
                  <div className="font-medium">New Design</div>
                  <div className="text-xs mt-0.5 opacity-75">First-of-kind spacecraft (+25% risk)</div>
                </button>
                <button onClick={() => setCalcInputs((prev) => ({ ...prev, hasHeritage: !prev.hasHeritage }))}
                  className={`p-3 rounded-lg text-sm text-left transition-all ${calcInputs.hasHeritage ? 'bg-green-500/20 border border-green-500/40 text-green-300' : 'bg-white/[0.06] border border-white/[0.06] text-slate-400'}`}
                >
                  <div className="font-medium">Heritage Platform</div>
                  <div className="text-xs mt-0.5 opacity-75">Proven bus/platform (-10% risk)</div>
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Results Panel */}
        <ScrollReveal delay={0.1}>
          <div className="space-y-4">
            <div className="card-elevated p-6 border border-amber-500/20">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-3">Estimated Total Premium</h3>
              <div className="text-4xl font-bold font-display text-amber-400 mb-1">{formatCurrency(calcResult.totalPremium)}</div>
              <div className="text-sm text-slate-400">
                Effective rate: <span className="text-white font-mono font-bold">{calcResult.effectiveRate.toFixed(2)}%</span> of {formatCurrency(calcInputs.satelliteValue)} insured value
              </div>
            </div>

            <div className="card p-5">
              <h4 className="text-sm font-semibold text-white mb-4">Premium Breakdown</h4>
              <div className="space-y-3">
                {[
                  { label: 'Launch Risk', value: calcResult.launchRisk, color: 'from-red-500 to-orange-500', icon: '\u{1F680}' },
                  { label: 'In-Orbit Risk (Year 1)', value: calcResult.inOrbitRisk, color: 'from-blue-500 to-slate-200', icon: '\u{1F6F0}\u{FE0F}' },
                  { label: 'Third-Party Liability', value: calcResult.thirdPartyLiability, color: 'from-purple-500 to-pink-500', icon: '\u{2696}\u{FE0F}' },
                ].map((item) => {
                  const pct = calcResult.totalPremium > 0 ? (item.value / calcResult.totalPremium) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-300 flex items-center gap-2"><span>{item.icon}</span> {item.label}</span>
                        <span className="text-white font-mono font-bold">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-2.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="text-right text-xs text-slate-500 mt-0.5">{pct.toFixed(1)}% of total</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <h4 className="text-sm font-semibold text-white mb-3">Risk Factors Applied</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 rounded bg-white/[0.06]"><span className="text-slate-400">Orbit</span><div className="text-white font-medium">{ORBIT_RISK_FACTORS[calcInputs.orbitType].label}</div></div>
                <div className="p-2 rounded bg-white/[0.06]"><span className="text-slate-400">Vehicle Multiplier</span><div className="text-white font-medium font-mono">{(LAUNCH_VEHICLES.find((v) => v.name === calcInputs.launchVehicle)?.riskMultiplier || 1.0).toFixed(2)}x</div></div>
                <div className="p-2 rounded bg-white/[0.06]"><span className="text-slate-400">Duration Adj.</span><div className="text-white font-medium">{calcInputs.missionDuration > 15 ? '+30%' : calcInputs.missionDuration > 10 ? '+15%' : calcInputs.missionDuration < 3 ? '-20%' : 'Standard'}</div></div>
                <div className="p-2 rounded bg-white/[0.06]"><span className="text-slate-400">Design Premium</span><div className="text-white font-medium">{calcInputs.isNewDesign ? '+25% new design' : 'None'}{calcInputs.hasHeritage ? ', -10% heritage' : ''}</div></div>
              </div>
            </div>

            <button onClick={() => setShowInsurerComparison(!showInsurerComparison)}
              className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-white/10 text-white/90 hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
            >
              {showInsurerComparison ? 'Hide' : 'Show'} Insurer Comparison Estimates
              <svg className={`w-4 h-4 transition-transform ${showInsurerComparison ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </ScrollReveal>
      </div>

      {/* Insurer Comparison Table */}
      {showInsurerComparison && (
        <ScrollReveal>
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-white mb-1">Estimated Premium Comparison by Insurer</h3>
            <p className="text-slate-400 text-xs mb-4">Indicative estimates based on market positioning. Actual quotes require formal submission.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-white/[0.06]">
                    <th className="text-left py-2 pr-4">Insurer</th><th className="text-right py-2 pr-4">Est. Premium</th><th className="text-right py-2 pr-4">Eff. Rate</th><th className="text-left py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {insurerEstimates.sort((a, b) => a.premium - b.premium).map((est) => (
                    <tr key={est.insurer} className="border-b border-white/[0.06] hover:bg-white/[0.08]/20">
                      <td className="py-2.5 pr-4 text-white font-medium">{est.insurer}</td>
                      <td className="py-2.5 pr-4 text-right text-white/90 font-mono font-bold">{formatCurrency(est.premium)}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-400 font-mono">{est.rate.toFixed(2)}%</td>
                      <td className="py-2.5 text-slate-400 text-xs">{est.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* Benchmark Rate Cards */}
      <ScrollReveal delay={0.15}>
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Industry Rate Benchmarks</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-white/[0.06]">
                  <th className="text-left py-2 pr-4">Coverage Type</th><th className="text-right py-2 pr-4">Base Rate</th><th className="text-right py-2 pr-4">Risk Multiplier</th><th className="text-right py-2 pr-4">Effective Rate</th><th className="text-left py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {PREMIUM_RATE_BENCHMARKS.map((b) => (
                  <tr key={b.type} className="border-b border-white/[0.06] hover:bg-white/[0.08]/20">
                    <td className="py-2.5 pr-4 text-white font-medium"><span className="mr-2">{b.icon}</span>{b.label}</td>
                    <td className="py-2.5 pr-4 text-right text-slate-400 font-mono">{b.baseRate.toFixed(1)}%</td>
                    <td className="py-2.5 pr-4 text-right text-slate-400 font-mono">{b.riskMultiplier.toFixed(1)}x</td>
                    <td className="py-2.5 pr-4 text-right text-white/90 font-mono font-bold">{b.effectiveRate.toFixed(2)}%</td>
                    <td className="py-2.5 text-slate-400 text-xs max-w-xs">{b.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>

      {/* Disclaimer */}
      <div className="card p-5 border-dashed">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{'\u{26A0}\u{FE0F}'}</span>
          <div>
            <h4 className="text-white font-medium text-sm mb-1">Disclaimer</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              These estimates are for informational purposes only and do not constitute an insurance quote or offer.
              Actual premiums are determined by underwriters based on detailed mission analysis, spacecraft design review,
              launch vehicle track record, and current market conditions. Contact a licensed space insurance broker for binding quotes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
