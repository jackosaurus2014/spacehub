'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

/* ------------------------------------------------------------------ */
/*  Data & Types                                                        */
/* ------------------------------------------------------------------ */

interface KpLevel {
  kp: number;
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
  visibility: string;
}

const KP_LEVELS: KpLevel[] = [
  { kp: 0, label: 'Quiet', color: 'text-green-400', borderColor: 'border-green-500/30', bgColor: 'bg-green-500/10', description: 'Minimal geomagnetic activity', visibility: 'Not visible at most latitudes' },
  { kp: 1, label: 'Quiet', color: 'text-green-400', borderColor: 'border-green-500/30', bgColor: 'bg-green-500/10', description: 'Low activity, calm magnetosphere', visibility: 'Faintly visible above 65 N (Iceland, northern Norway)' },
  { kp: 2, label: 'Unsettled', color: 'text-green-300', borderColor: 'border-green-400/30', bgColor: 'bg-green-400/10', description: 'Slight geomagnetic disturbance', visibility: 'Visible above 62 N (Fairbanks, Tromso)' },
  { kp: 3, label: 'Unsettled', color: 'text-yellow-400', borderColor: 'border-yellow-500/30', bgColor: 'bg-yellow-500/10', description: 'Minor activity, occasional substorms', visibility: 'Visible above 58 N (Edmonton, Stockholm)' },
  { kp: 4, label: 'Active', color: 'text-yellow-400', borderColor: 'border-yellow-500/30', bgColor: 'bg-yellow-500/10', description: 'Enhanced auroral activity', visibility: 'Visible above 55 N (Edmonton, Glasgow, Moscow)' },
  { kp: 5, label: 'Minor Storm (G1)', color: 'text-orange-400', borderColor: 'border-orange-500/30', bgColor: 'bg-orange-500/10', description: 'Geomagnetic storm threshold reached', visibility: 'Northern US states, southern Canada (50 N) — Seattle, Minneapolis, Bangor' },
  { kp: 6, label: 'Moderate Storm (G2)', color: 'text-orange-400', borderColor: 'border-orange-500/30', bgColor: 'bg-orange-500/10', description: 'Moderate storm with vibrant aurora', visibility: 'Northern-tier US (47 N) — Portland, Milwaukee, Burlington' },
  { kp: 7, label: 'Strong Storm (G3)', color: 'text-red-400', borderColor: 'border-red-500/30', bgColor: 'bg-red-500/10', description: 'Strong storm, aurora pushed toward mid-latitudes', visibility: 'Mid-latitudes (45 N) — Chicago, Boston, Denver, all of UK' },
  { kp: 8, label: 'Severe Storm (G4)', color: 'text-red-400', borderColor: 'border-red-500/30', bgColor: 'bg-red-500/10', description: 'Severe storm with widespread aurora', visibility: 'Southern mid-latitudes (40 N) — New York, San Francisco, Rome' },
  { kp: 9, label: 'Extreme Storm (G5)', color: 'text-fuchsia-400', borderColor: 'border-fuchsia-500/30', bgColor: 'bg-fuchsia-500/10', description: 'Extreme storm, rare and spectacular', visibility: 'Southern US (30 N) — Houston, Atlanta, Los Angeles, Madrid' },
];

// Simulated "current" conditions for display purposes
const SIMULATED_CONDITIONS = {
  kpIndex: 4,
  kpTrend: 'rising' as const,
  solarWind: 485,
  bz: -3.2,
  bt: 7.8,
  density: 8.4,
  sunspotNumber: 178,
  f107: 195,
  lastUpdate: '2026-03-18T14:30:00Z',
};

const AURORA_SCIENCE = [
  {
    title: 'Solar Wind',
    description:
      'The sun continuously emits a stream of charged particles (protons and electrons) traveling at 300-800 km/s. During solar events like coronal mass ejections (CMEs), this wind intensifies dramatically, carrying stronger magnetic fields toward Earth.',
    color: 'from-yellow-500/20 to-orange-500/20',
    accent: 'text-yellow-400',
  },
  {
    title: 'Magnetosphere',
    description:
      'Earth\'s magnetic field creates a protective bubble called the magnetosphere. When the solar wind\'s magnetic field points southward (negative Bz), it connects with Earth\'s field and allows particles to funnel along field lines toward the poles.',
    color: 'from-blue-500/20 to-cyan-500/20',
    accent: 'text-blue-400',
  },
  {
    title: 'Charged Particles',
    description:
      'Funneled particles spiral down along magnetic field lines into the upper atmosphere (100-300 km altitude). They collide with oxygen and nitrogen molecules, transferring energy that is released as photons — the aurora.',
    color: 'from-green-500/20 to-emerald-500/20',
    accent: 'text-green-400',
  },
  {
    title: 'Aurora Colors',
    description:
      'Green aurora (557.7 nm) comes from oxygen at 100-200 km altitude and is the most common. Red aurora (630 nm) is oxygen at higher altitudes (200-300 km). Purple/blue aurora comes from nitrogen molecules at lower altitudes.',
    color: 'from-purple-500/20 to-fuchsia-500/20',
    accent: 'text-purple-400',
  },
];

const VIEWING_TIPS = [
  {
    title: 'Get Away from City Lights',
    description:
      'Aurora can be faint, especially at lower latitudes during moderate storms. Drive at least 20-30 miles from major cities. The darkest skies dramatically improve your chances of seeing subtle green glows on the horizon.',
  },
  {
    title: 'Look North (or South)',
    description:
      'In the northern hemisphere, aurora appears on the northern horizon first and expands overhead as activity strengthens. Use a compass or the North Star. In the southern hemisphere, look toward the South Pole.',
  },
  {
    title: 'Camera First, Eyes Second',
    description:
      'Modern cameras are far more sensitive than the human eye. Even when aurora appears as a faint gray glow visually, a 5-10 second exposure at ISO 3200 will reveal vivid greens and purples. Always try a photo before giving up.',
  },
  {
    title: 'Monitor Real-Time Data',
    description:
      'The Kp index updates every 3 hours, but real-time magnetometer data and DSCOVR solar wind readings update every minute. A sudden southward Bz swing can trigger aurora within 30-60 minutes.',
  },
  {
    title: 'Camera Settings for Aurora',
    description:
      'Use ISO 1600-6400, f/2.8 or wider, 5-15 second exposures. Shorter exposures capture curtain structure; longer ones capture diffuse glows. Focus manually on a bright star. Shoot RAW for maximum editing flexibility.',
  },
  {
    title: 'Best Months',
    description:
      'Equinox months (March and September/October) have a "Russell-McPherron effect" that statistically increases geomagnetic storms. Combined with longer dark hours at high latitudes, autumn and spring are prime aurora season.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function AuroraForecastPage() {
  const [selectedKp, setSelectedKp] = useState<number>(SIMULATED_CONDITIONS.kpIndex);

  const currentLevel = KP_LEVELS[selectedKp];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Aurora Forecast & Space Weather"
          subtitle="Real-time geomagnetic conditions, Kp index, and aurora visibility guide for enthusiasts and photographers"
          icon={<span className="text-4xl">&#127752;</span>}
          accentColor="green"
        />

        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-slate-400" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/space-weather" className="hover:text-white transition-colors">Space Weather</Link>
            </li>
            <li>/</li>
            <li className="text-slate-300">Aurora Forecast</li>
          </ol>
        </nav>

        {/* Intro */}
        <ScrollReveal>
          <div className="card-elevated p-6 sm:p-8 mb-10 border border-green-500/10 bg-gradient-to-br from-green-500/[0.02] to-purple-500/[0.02]">
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-4">
              The aurora borealis (Northern Lights) and aurora australis (Southern Lights) are nature&apos;s most
              spectacular light show — curtains of green, purple, and red dancing across the sky when the sun
              sends charged particles into Earth&apos;s magnetic field.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              This page helps you understand current space weather conditions, predict when and where the aurora
              will be visible, and maximize your chances of witnessing this phenomenon. We&apos;re currently near the
              peak of Solar Cycle 25 — the best aurora viewing opportunity in over 20 years.
            </p>
          </div>
        </ScrollReveal>

        {/* ── Section 1: Current Conditions ──────────────────────────────── */}
        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">1</span>
              Current Conditions
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Simulated real-time data based on typical Solar Cycle 25 conditions. Visit{' '}
              <Link href="/space-weather" className="text-green-400 hover:text-green-300 transition-colors">
                our full Space Weather dashboard
              </Link>{' '}
              for live data from NOAA SWPC.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-green-400">
                  Kp {SIMULATED_CONDITIONS.kpIndex}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Kp Index</div>
                <div className="text-xs text-yellow-400 mt-1 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  Rising
                </div>
              </div>

              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {SIMULATED_CONDITIONS.solarWind}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Solar Wind km/s</div>
              </div>

              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-red-400">
                  {SIMULATED_CONDITIONS.bz}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Bz (nT)</div>
                <div className="text-xs text-red-400 mt-1">Southward</div>
              </div>

              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {SIMULATED_CONDITIONS.bt}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Bt (nT)</div>
              </div>

              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-yellow-400">
                  {SIMULATED_CONDITIONS.sunspotNumber}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Sunspot #</div>
              </div>

              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {SIMULATED_CONDITIONS.f107}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">F10.7 SFU</div>
              </div>
            </div>

            {/* Activity summary */}
            <div className={`card p-5 ${currentLevel.borderColor} border`}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`w-3 h-3 rounded-full ${currentLevel.bgColor} ${currentLevel.color} animate-pulse`} style={{ boxShadow: '0 0 8px currentColor' }} />
                <h3 className={`font-semibold ${currentLevel.color}`}>
                  Kp {SIMULATED_CONDITIONS.kpIndex} — {KP_LEVELS[SIMULATED_CONDITIONS.kpIndex].label}
                </h3>
              </div>
              <p className="text-slate-400 text-sm">
                {KP_LEVELS[SIMULATED_CONDITIONS.kpIndex].description}.{' '}
                <span className="text-slate-300">{KP_LEVELS[SIMULATED_CONDITIONS.kpIndex].visibility}</span>.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Bz is currently southward ({SIMULATED_CONDITIONS.bz} nT), which is favorable for aurora.
                Solar wind speed of {SIMULATED_CONDITIONS.solarWind} km/s is above average.
              </p>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Section 2: Aurora Visibility by Kp ─────────────────────────── */}
        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">2</span>
              Aurora Visibility by Kp Level
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              The Kp index (0-9) measures planetary geomagnetic activity. Higher Kp means aurora is visible at lower latitudes.
              Select a Kp level to see where aurora would be visible.
            </p>

            {/* Kp Selector */}
            <div className="flex flex-wrap gap-2 mb-6">
              {KP_LEVELS.map((level) => (
                <button
                  key={level.kp}
                  onClick={() => setSelectedKp(level.kp)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    selectedKp === level.kp
                      ? `${level.bgColor} ${level.color} ${level.borderColor}`
                      : 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  Kp {level.kp}
                </button>
              ))}
            </div>

            {/* Selected Kp detail */}
            <div className={`card p-6 ${currentLevel.borderColor} border transition-all`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className={`text-lg font-bold ${currentLevel.color}`}>
                    Kp {selectedKp} — {currentLevel.label}
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">{currentLevel.description}</p>
                </div>
                <div className={`shrink-0 w-14 h-14 rounded-xl ${currentLevel.bgColor} flex items-center justify-center`}>
                  <span className={`text-2xl font-bold font-display ${currentLevel.color}`}>{selectedKp}</span>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <h4 className="text-white font-semibold text-sm mb-2">Where Aurora Is Visible</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{currentLevel.visibility}</p>
              </div>

              {selectedKp >= 5 && (
                <div className="mt-4 p-3 rounded-lg bg-green-500/[0.06] border border-green-500/20">
                  <p className="text-green-400 text-sm font-medium">
                    {selectedKp >= 7
                      ? 'Rare event! If Kp reaches this level, consider driving to dark skies immediately. These storms can produce vivid, overhead aurora even at mid-latitudes.'
                      : 'Storm conditions! Aurora may be visible from areas that rarely see it. Check for clear skies and get away from city lights.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        </ScrollReveal>

        {/* ── Section 3: How Aurora Works ─────────────────────────────────── */}
        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">3</span>
              How Aurora Works
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              The aurora is a visible manifestation of the sun-Earth connection — a chain reaction from the solar surface to our upper atmosphere.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AURORA_SCIENCE.map((item, index) => (
                <div key={item.title} className="card p-5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-sm font-bold ${item.accent}`}>
                      {index + 1}
                    </span>
                    <h3 className={`font-semibold ${item.accent}`}>{item.title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ── Section 4: Viewing Tips ────────────────────────────────────── */}
        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">4</span>
              Best Viewing Tips
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Maximize your chances of seeing and photographing the aurora.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {VIEWING_TIPS.map((tip) => (
                <div key={tip.title} className="card p-5 hover:border-white/10 transition-all">
                  <h3 className="text-white font-semibold text-sm mb-2">{tip.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{tip.description}</p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ── Section 5: Solar Cycle 25 ──────────────────────────────────── */}
        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">5</span>
              Solar Cycle 25: A Golden Era for Aurora
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              We&apos;re currently experiencing the most active period for aurora in over two decades.
            </p>

            <div className="card-elevated p-6 border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.03] to-green-500/[0.03]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-semibold mb-3">Where We Are in the Cycle</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                      <span className="text-slate-400">Solar Cycle</span>
                      <span className="text-white font-mono">25</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                      <span className="text-slate-400">Cycle Start</span>
                      <span className="text-white font-mono">December 2019</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                      <span className="text-slate-400">Current Phase</span>
                      <span className="text-yellow-400 font-mono">Near Solar Maximum</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                      <span className="text-slate-400">Monthly Sunspot #</span>
                      <span className="text-white font-mono">~{SIMULATED_CONDITIONS.sunspotNumber}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-400">Expected Peak Window</span>
                      <span className="text-green-400 font-mono">2024-2026</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-3">Why This Matters for Aurora</h3>
                  <div className="space-y-3">
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Solar Cycle 25 has significantly exceeded initial predictions. The sun is producing
                      more coronal mass ejections (CMEs) and solar flares than forecast, driving frequent
                      geomagnetic storms.
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Multiple Kp 7+ storms have occurred in 2024 and 2025, with aurora visible as far south as
                      Florida and Mexico — events that happen only a few times per solar cycle.
                    </p>
                    <div className="p-3 rounded-lg bg-green-500/[0.08] border border-green-500/20">
                      <p className="text-green-400 text-sm font-medium">
                        The next 1-2 years represent the best opportunity to see aurora in 20+ years.
                        Even if you live at mid-latitudes (40-50 N), major storms will provide viewing chances.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <ScrollReveal>
          <div className="card-elevated p-8 text-center mb-10 border border-green-500/20 bg-gradient-to-b from-green-500/[0.04] via-purple-500/[0.02] to-transparent">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
              Track Live Space Weather Conditions
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mb-6 max-w-xl mx-auto">
              Our full Space Weather dashboard provides real-time solar wind data, Kp forecasts,
              radiation belt status, and 7-day geomagnetic outlooks sourced from NOAA SWPC.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/space-weather"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-slate-900 font-semibold rounded-lg transition-all text-sm"
              >
                Open Space Weather Dashboard
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="https://www.swpc.noaa.gov/products/3-day-forecast"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.08] hover:bg-white/[0.12] text-white font-medium rounded-lg transition-all text-sm"
              >
                NOAA 3-Day Forecast
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        </ScrollReveal>

        {/* Related Modules */}
        <RelatedModules
          modules={
            PAGE_RELATIONS['aurora-forecast'] || [
              { name: 'Space Weather', description: 'Full weather dashboard', href: '/space-weather', icon: '&#9728;' },
              { name: 'Satellite Tracker', description: 'Live orbital tracking', href: '/satellites', icon: '&#128752;' },
              { name: 'Space Environment', description: 'Weather & debris', href: '/space-environment', icon: '&#127757;' },
              { name: 'Solar Exploration', description: 'Deep space missions', href: '/solar-exploration', icon: '&#9728;' },
            ]
          }
        />
      </div>
    </div>
  );
}
