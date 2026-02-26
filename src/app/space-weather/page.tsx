'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Severity = 'Quiet' | 'Minor' | 'Moderate' | 'Strong' | 'Severe';

interface SolarWindData {
  speed: number;        // km/s
  density: number;      // protons/cm^3
  bz: number;           // nT (IMF Bz component)
  bt: number;           // nT (total field)
  temperature: number;  // Kelvin
}

interface GeomagneticData {
  kpIndex: number;
  kpLabel: string;
  stormLevel: string;
}

interface SolarFlareData {
  xrayFlux: string;
  peakClass: string;
  region: string;
  probability24h: { C: number; M: number; X: number };
}

interface RadiationBelt {
  innerBelt: Severity;
  outerBelt: Severity;
  solarProtonEvents: boolean;
  galacticCosmicRays: Severity;
}

interface AuroralData {
  northLatitude: number;
  southLatitude: number;
  visibility: string[];
}

interface ForecastDay {
  day: string;
  date: string;
  kpForecast: number;
  condition: Severity;
  solarFlareProb: number;
  geoStormProb: number;
  summary: string;
}

interface ImpactAssessment {
  domain: string;
  icon: string;
  level: Severity;
  description: string;
  recommendation: string;
}

interface HistoricalEvent {
  year: number;
  name: string;
  severity: Severity;
  kpMax: number;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Severity color helpers                                             */
/* ------------------------------------------------------------------ */

const severityColors: Record<Severity, { bg: string; text: string; border: string; badge: string }> = {
  Quiet:    { bg: 'bg-green-900/30',  text: 'text-green-400',  border: 'border-green-500/40',  badge: 'bg-green-500/20 text-green-300' },
  Minor:    { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500/40', badge: 'bg-yellow-500/20 text-yellow-300' },
  Moderate: { bg: 'bg-amber-900/30',  text: 'text-amber-400',  border: 'border-amber-500/40',  badge: 'bg-amber-500/20 text-amber-300' },
  Strong:   { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500/40', badge: 'bg-orange-500/20 text-orange-300' },
  Severe:   { bg: 'bg-red-900/30',    text: 'text-red-400',    border: 'border-red-500/40',    badge: 'bg-red-500/20 text-red-300' },
};

function SeverityBadge({ level }: { level: Severity }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${severityColors[level].badge}`}>
      {level}
    </span>
  );
}

function severityDot(level: Severity) {
  const dotMap: Record<Severity, string> = {
    Quiet: 'bg-green-400', Minor: 'bg-yellow-400', Moderate: 'bg-amber-400',
    Strong: 'bg-orange-400', Severe: 'bg-red-400',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotMap[level]}`} />;
}

/* ------------------------------------------------------------------ */
/*  Hardcoded realistic data                                           */
/* ------------------------------------------------------------------ */

const solarWind: SolarWindData = {
  speed: 423,
  density: 5.2,
  bz: -3.8,
  bt: 6.1,
  temperature: 112000,
};

const geomagnetic: GeomagneticData = {
  kpIndex: 3,
  kpLabel: 'Unsettled',
  stormLevel: 'G0 (Below Storm Level)',
};

const solarFlare: SolarFlareData = {
  xrayFlux: 'B4.2',
  peakClass: 'C1.3',
  region: 'AR 3945',
  probability24h: { C: 55, M: 15, X: 1 },
};

const radiationBelt: RadiationBelt = {
  innerBelt: 'Quiet',
  outerBelt: 'Minor',
  solarProtonEvents: false,
  galacticCosmicRays: 'Quiet',
};

const auroralOval: AuroralData = {
  northLatitude: 64,
  southLatitude: -66,
  visibility: ['Northern Scandinavia', 'Iceland', 'Northern Canada', 'Alaska', 'Southern tip of New Zealand'],
};

const forecast: ForecastDay[] = [
  { day: 'Today',     date: 'Feb 25', kpForecast: 3, condition: 'Minor',    solarFlareProb: 55, geoStormProb: 20, summary: 'Unsettled conditions from CH HSS arrival' },
  { day: 'Wed',       date: 'Feb 26', kpForecast: 4, condition: 'Moderate', solarFlareProb: 60, geoStormProb: 40, summary: 'G1 storm watch; coronal hole high-speed stream peak' },
  { day: 'Thu',       date: 'Feb 27', kpForecast: 3, condition: 'Minor',    solarFlareProb: 45, geoStormProb: 25, summary: 'HSS waning; isolated substorms possible' },
  { day: 'Fri',       date: 'Feb 28', kpForecast: 2, condition: 'Quiet',    solarFlareProb: 35, geoStormProb: 10, summary: 'Return to background levels expected' },
  { day: 'Sat',       date: 'Mar 01', kpForecast: 2, condition: 'Quiet',    solarFlareProb: 30, geoStormProb: 10, summary: 'Quiet conditions; no Earth-directed CMEs' },
  { day: 'Sun',       date: 'Mar 02', kpForecast: 3, condition: 'Minor',    solarFlareProb: 50, geoStormProb: 15, summary: 'New CH rotating into geo-effective position' },
  { day: 'Mon',       date: 'Mar 03', kpForecast: 4, condition: 'Moderate', solarFlareProb: 55, geoStormProb: 35, summary: 'Possible G1 conditions from recurrent CH' },
];

const impactAssessments: ImpactAssessment[] = [
  {
    domain: 'Satellite Operations',
    icon: '\uD83D\uDEF0\uFE0F',
    level: 'Minor',
    description: 'Elevated drag on LEO satellites. Surface charging possible on GEO spacecraft in outer radiation belt.',
    recommendation: 'Monitor drag coefficients on LEO assets. Review anomaly resolution procedures for GEO platforms.',
  },
  {
    domain: 'HF Communications',
    icon: '\uD83D\uDCE1',
    level: 'Quiet',
    description: 'HF propagation normal on sunlit side. No polar cap absorption events in progress.',
    recommendation: 'No action required. Standard frequency management protocols apply.',
  },
  {
    domain: 'GPS / GNSS Accuracy',
    icon: '\uD83D\uDCCD',
    level: 'Minor',
    description: 'Slight ionospheric scintillation at high latitudes may degrade single-frequency GPS accuracy by 2-5 meters.',
    recommendation: 'Use dual-frequency receivers for precision applications at latitudes above 60 degrees.',
  },
  {
    domain: 'Astronaut EVA Safety',
    icon: '\uD83D\uDC69\u200D\uD83D\uDE80',
    level: 'Quiet',
    description: 'Radiation dose rates within nominal limits. No solar proton events expected in 24-hour window.',
    recommendation: 'EVA operations may proceed per standard safety protocols. Monitor for M-class flare alerts.',
  },
  {
    domain: 'Power Grid Risk',
    icon: '\u26A1',
    level: 'Quiet',
    description: 'Geomagnetically induced currents (GICs) below threshold for transformer impacts.',
    recommendation: 'No protective actions required. Maintain situational awareness for Wednesday G1 watch period.',
  },
];

const historicalEvents: HistoricalEvent[] = [
  { year: 1859, name: 'Carrington Event',        severity: 'Severe',   kpMax: 9, description: 'Largest recorded geomagnetic storm. Telegraphs operated without batteries. Aurora visible near the equator.' },
  { year: 1921, name: 'New York Railroad Storm',  severity: 'Severe',   kpMax: 9, description: 'Intense storm caused fires in telegraph and railroad signal systems across the northeastern United States.' },
  { year: 1972, name: 'August 1972 Solar Storm',  severity: 'Strong',   kpMax: 8, description: 'Disrupted long-distance communications and detonated sea mines in Vietnam. Between Apollo 16 and 17 missions.' },
  { year: 1989, name: 'Quebec Blackout',          severity: 'Severe',   kpMax: 9, description: 'Collapsed Hydro-Quebec power grid in 92 seconds, leaving 6 million without electricity for 9 hours.' },
  { year: 2000, name: 'Bastille Day Event',       severity: 'Strong',   kpMax: 9, description: 'X5.7 flare and fast CME caused S3 radiation storm. Disrupted satellites and shortwave communications.' },
  { year: 2003, name: 'Halloween Storms',         severity: 'Severe',   kpMax: 9, description: 'Series of extreme storms over two weeks. Damaged satellites, rerouted airlines, caused Swedish blackout.' },
  { year: 2012, name: 'July 2012 Near-Miss CME',  severity: 'Severe',   kpMax: 9, description: 'Carrington-class CME crossed Earth orbit path one week after Earth passed. Detected by STEREO-A.' },
  { year: 2024, name: 'May 2024 Superstorm',      severity: 'Severe',   kpMax: 9, description: 'Strongest storm since 2003. G5 conditions reached. Aurora visible as far south as Florida and Mexico.' },
];

/* ------------------------------------------------------------------ */
/*  Related links                                                      */
/* ------------------------------------------------------------------ */

const relatedLinks = [
  { href: '/space-environment', label: 'Space Environment',  icon: '\uD83C\uDF0D' },
  { href: '/satellites',        label: 'Satellite Tracker',  icon: '\uD83D\uDEF0\uFE0F' },
  { href: '/orbital-calculator', label: 'Orbital Calculator', icon: '\uD83E\uDDEE' },
  { href: '/mission-control',   label: 'Mission Control',    icon: '\uD83D\uDEE0\uFE0F' },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function SpaceWeatherDashboard() {
  const [activeTab, setActiveTab] = useState<'current' | 'forecast' | 'impacts' | 'history'>('current');

  const lastUpdated = 'Feb 25, 2026 14:32 UTC';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <AnimatedPageHeader
          title="Space Weather Dashboard"
          subtitle="Real-time solar activity, geomagnetic conditions, and operational impact assessments for space and ground-based systems."
          icon={<span>&#9728;&#65039;</span>}
          accentColor="amber"
        />

        {/* Last updated + severity legend */}
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <p className="text-sm text-slate-400">
              Last updated: <span className="text-slate-300 font-medium">{lastUpdated}</span>
              <span className="ml-2 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-medium">LIVE</span>
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="font-medium text-slate-300">Severity:</span>
              {(['Quiet', 'Minor', 'Moderate', 'Strong', 'Severe'] as Severity[]).map((s) => (
                <span key={s} className="flex items-center gap-1">{severityDot(s)} {s}</span>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Tab navigation */}
        <ScrollReveal delay={0.05}>
          <div className="flex gap-1 mb-8 border-b border-slate-700/50 overflow-x-auto">
            {([
              { key: 'current',  label: 'Current Conditions' },
              { key: 'forecast', label: '7-Day Forecast' },
              { key: 'impacts',  label: 'Impact Assessments' },
              { key: 'history',  label: 'Historical Events' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* ============================================================ */}
        {/*  TAB: Current Conditions                                      */}
        {/* ============================================================ */}
        {activeTab === 'current' && (
          <div className="space-y-8">
            {/* Overall status banner */}
            <ScrollReveal>
              <div className={`rounded-xl border p-5 ${severityColors.Minor.bg} ${severityColors.Minor.border}`}>
                <div className="flex items-center gap-3">
                  {severityDot('Minor')}
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Overall Space Weather: Minor Activity</h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Coronal hole high-speed stream arriving at Earth. Kp 3 expected with isolated Kp 4 intervals. Low probability of significant flare activity.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Solar Wind + Geomagnetic + Flare cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Solar Wind */}
              <ScrollReveal delay={0.05}>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 h-full">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Solar Wind</h3>
                  <div className="space-y-3">
                    <Metric label="Speed" value={`${solarWind.speed} km/s`} note="Normal: 300-400" warn={solarWind.speed > 500} />
                    <Metric label="Density" value={`${solarWind.density} p/cm\u00B3`} note="Normal: 3-5" warn={solarWind.density > 10} />
                    <Metric label="IMF Bz" value={`${solarWind.bz} nT`} note="Southward = geo-effective" warn={solarWind.bz < -5} />
                    <Metric label="IMF Bt" value={`${solarWind.bt} nT`} note="Total field strength" warn={solarWind.bt > 10} />
                    <Metric label="Temperature" value={`${(solarWind.temperature / 1000).toFixed(0)}K K`} note="Proton temperature" warn={false} />
                  </div>
                </div>
              </ScrollReveal>

              {/* Geomagnetic Activity */}
              <ScrollReveal delay={0.1}>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 h-full">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Geomagnetic Activity</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-5xl font-bold text-amber-400">{geomagnetic.kpIndex}</div>
                    <div>
                      <p className="text-slate-200 font-medium">{geomagnetic.kpLabel}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{geomagnetic.stormLevel}</p>
                    </div>
                  </div>
                  {/* Kp bar visualization */}
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: 9 }, (_, i) => {
                      const filled = i < geomagnetic.kpIndex;
                      const barColor = i < 4 ? 'bg-green-500' : i < 6 ? 'bg-yellow-500' : i < 8 ? 'bg-orange-500' : 'bg-red-500';
                      return (
                        <div
                          key={i}
                          className={`flex-1 h-3 rounded-sm ${filled ? barColor : 'bg-slate-700'}`}
                          title={`Kp ${i + 1}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Kp 1</span><span>Kp 5</span><span>Kp 9</span>
                  </div>
                </div>
              </ScrollReveal>

              {/* Solar Flares */}
              <ScrollReveal delay={0.15}>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 h-full">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Solar Flare Activity</h3>
                  <div className="space-y-3 mb-4">
                    <Metric label="X-ray Flux" value={solarFlare.xrayFlux} note="Current background" warn={false} />
                    <Metric label="24h Peak" value={solarFlare.peakClass} note={`Source: ${solarFlare.region}`} warn={false} />
                  </div>
                  <p className="text-xs text-slate-400 font-medium mb-2">24-Hour Flare Probability</p>
                  <div className="space-y-2">
                    <ProbBar label="C-class" percent={solarFlare.probability24h.C} color="bg-yellow-500" />
                    <ProbBar label="M-class" percent={solarFlare.probability24h.M} color="bg-orange-500" />
                    <ProbBar label="X-class" percent={solarFlare.probability24h.X} color="bg-red-500" />
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Radiation Belt + Auroral Oval */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Radiation Belt */}
              <ScrollReveal delay={0.05}>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Radiation Belt Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <StatusItem label="Inner Belt (Van Allen)" level={radiationBelt.innerBelt} />
                    <StatusItem label="Outer Belt" level={radiationBelt.outerBelt} />
                    <StatusItem label="Solar Proton Events" level={radiationBelt.solarProtonEvents ? 'Strong' : 'Quiet'} />
                    <StatusItem label="Galactic Cosmic Rays" level={radiationBelt.galacticCosmicRays} />
                  </div>
                </div>
              </ScrollReveal>

              {/* Auroral Oval */}
              <ScrollReveal delay={0.1}>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Auroral Oval Position</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-400">Northern Boundary</p>
                      <p className="text-2xl font-bold text-cyan-400">{auroralOval.northLatitude}&#176; N</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Southern Boundary</p>
                      <p className="text-2xl font-bold text-cyan-400">{Math.abs(auroralOval.southLatitude)}&#176; S</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mb-2">Visible From</p>
                  <div className="flex flex-wrap gap-1.5">
                    {auroralOval.visibility.map((loc) => (
                      <span key={loc} className="px-2 py-0.5 bg-cyan-900/30 border border-cyan-700/40 rounded text-xs text-cyan-300">
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/*  TAB: 7-Day Forecast                                          */}
        {/* ============================================================ */}
        {activeTab === 'forecast' && (
          <div className="space-y-6">
            <ScrollReveal>
              <p className="text-slate-300 mb-4">
                Planetary K-index forecast and geomagnetic storm probabilities for the next seven days, based on solar wind observations and coronal hole / CME analysis.
              </p>
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
              {forecast.map((day, i) => (
                <ScrollReveal key={day.date} delay={i * 0.04}>
                  <div className={`rounded-xl border p-4 h-full flex flex-col ${severityColors[day.condition].bg} ${severityColors[day.condition].border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-100">{day.day}</span>
                      <span className="text-xs text-slate-400">{day.date}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-3xl font-bold ${severityColors[day.condition].text}`}>{day.kpForecast}</span>
                      <span className="text-xs text-slate-400">Kp</span>
                    </div>
                    <SeverityBadge level={day.condition} />
                    <div className="mt-3 space-y-1.5 text-xs text-slate-400 flex-1">
                      <p>Flare: <span className="text-slate-300">{day.solarFlareProb}%</span></p>
                      <p>Storm: <span className="text-slate-300">{day.geoStormProb}%</span></p>
                    </div>
                    <p className="mt-3 text-xs text-slate-400 leading-snug border-t border-slate-700/50 pt-2">
                      {day.summary}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Forecast notes */}
            <ScrollReveal delay={0.15}>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5 mt-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Forecast Notes</h3>
                <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                  <li>A recurrent coronal hole (CH) is expected to become geo-effective on Feb 26, producing elevated solar wind speeds of 500-600 km/s.</li>
                  <li>Active Region AR 3945 has produced multiple C-class flares and has a beta-gamma magnetic configuration with M-class potential.</li>
                  <li>No Earth-directed CMEs currently tracked. The SOHO/LASCO coronagraph shows no significant halo events.</li>
                  <li>The next recurrent CH passage is expected around Mar 2-3, potentially producing similar conditions.</li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* ============================================================ */}
        {/*  TAB: Impact Assessments                                      */}
        {/* ============================================================ */}
        {activeTab === 'impacts' && (
          <div className="space-y-6">
            <ScrollReveal>
              <p className="text-slate-300 mb-4">
                Operational impact assessments based on current and forecast space weather conditions. Updated every 30 minutes.
              </p>
            </ScrollReveal>

            <div className="space-y-4">
              {impactAssessments.map((impact, i) => (
                <ScrollReveal key={impact.domain} delay={i * 0.06}>
                  <div className={`rounded-xl border p-5 ${severityColors[impact.level].bg} ${severityColors[impact.level].border}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <span className="text-3xl">{impact.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-100">{impact.domain}</h3>
                          <SeverityBadge level={impact.level} />
                        </div>
                        <p className="text-sm text-slate-300 mb-3">{impact.description}</p>
                        <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-3">
                          <p className="text-xs text-slate-400">
                            <span className="font-semibold text-slate-300">Recommendation:</span> {impact.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* NOAA Scale Reference */}
            <ScrollReveal delay={0.2}>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5 mt-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">NOAA Space Weather Scales Reference</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
                  <div>
                    <p className="font-medium text-slate-300 mb-1">Geomagnetic Storms (G)</p>
                    <p>G1 Minor (Kp 5) to G5 Extreme (Kp 9)</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-300 mb-1">Solar Radiation Storms (S)</p>
                    <p>S1 Minor to S5 Extreme (proton flux)</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-300 mb-1">Radio Blackouts (R)</p>
                    <p>R1 Minor (M1 flare) to R5 Extreme (X20+ flare)</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* ============================================================ */}
        {/*  TAB: Historical Events                                       */}
        {/* ============================================================ */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <ScrollReveal>
              <p className="text-slate-300 mb-4">
                Significant space weather events throughout recorded history. Understanding past extreme events helps model risk for future occurrences.
              </p>
            </ScrollReveal>

            <div className="space-y-4">
              {historicalEvents.map((event, i) => (
                <ScrollReveal key={event.year} delay={i * 0.05}>
                  <div className={`rounded-xl border p-5 ${severityColors[event.severity].bg} ${severityColors[event.severity].border}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="text-center sm:text-left shrink-0">
                        <p className="text-3xl font-bold text-slate-100">{event.year}</p>
                        <p className="text-xs text-slate-400 mt-1">Kp {event.kpMax}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-100">{event.name}</h3>
                          <SeverityBadge level={event.severity} />
                        </div>
                        <p className="text-sm text-slate-300">{event.description}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Statistics note */}
            <ScrollReveal delay={0.25}>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5 mt-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Recurrence Statistics</h3>
                <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                  <li>Carrington-class events (Dst &lt; -900 nT) have an estimated 1.6-12% probability per decade.</li>
                  <li>G5 Extreme storms occur roughly 4 times per solar cycle (approximately every 11 years).</li>
                  <li>The current Solar Cycle 25 peaked in mid-2025 and is expected to remain active through 2026.</li>
                  <li>Economic impact of a Carrington-class event today: estimated $1-2 trillion in the first year (NAS 2008 study).</li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* ============================================================ */}
        {/*  Related Links                                                */}
        {/* ============================================================ */}
        <ScrollReveal delay={0.1}>
          <div className="mt-12 pt-8 border-t border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Related Pages</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border border-slate-700/40 rounded-lg hover:bg-slate-700/50 hover:border-amber-500/30 transition-colors"
                >
                  <span className="text-lg">{link.icon}</span>
                  <span className="text-sm text-slate-300">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small helper components                                            */
/* ------------------------------------------------------------------ */

function Metric({ label, value, note, warn }: { label: string; value: string; note: string; warn: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-lg font-semibold ${warn ? 'text-amber-400' : 'text-slate-100'}`}>{value}</p>
      </div>
      <p className="text-[10px] text-slate-500 text-right max-w-[90px]">{note}</p>
    </div>
  );
}

function ProbBar({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-medium">{percent}%</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function StatusItem({ label, level }: { label: string; level: Severity }) {
  return (
    <div className="bg-slate-900/30 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {severityDot(level)}
        <span className={`text-sm font-medium ${severityColors[level].text}`}>{level}</span>
      </div>
    </div>
  );
}
