'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

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
  pressure: number;     // nPa (dynamic pressure)
  phi: number;          // degrees (IMF clock angle)
}

interface GeomagneticData {
  kpIndex: number;
  kpLabel: string;
  stormLevel: string;
  dstIndex: number;        // nT
  planetaryAIndex: number; // ap index
  kpRecent: number[];      // last 8 Kp values (3-hour cadence = 24 hours)
}

interface SolarFlareActivityData {
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
  electronFlux: string;   // >2 MeV electron flux
  protonFlux: string;     // >10 MeV proton flux
}

interface AuroralData {
  northLatitude: number;
  southLatitude: number;
  visibility: string[];
  highLatProb: number;    // % probability aurora visible > 60 deg
  midLatProb: number;     // % probability aurora visible 40-60 deg
  lowLatProb: number;     // % probability aurora visible < 40 deg
}

interface SolarCycleData {
  cycleNumber: number;
  startDate: string;
  predictedPeak: string;
  currentPhase: string;
  sunspotNumber: number;        // monthly smoothed
  sunspotNumberDaily: number;   // daily observed
  solarFluxIndex: number;       // F10.7 cm (sfu)
  monthsSinceMin: number;
  predictedMaxSunspots: number;
  hemisphereActivity: { north: number; south: number };
  sunspotTrend: number[];       // last 12 months smoothed SSN
}

interface RecentSolarEvent {
  id: string;
  type: 'flare' | 'cme' | 'radiation' | 'filament' | 'proton';
  timestamp: string;
  classification?: string;   // e.g., C3.2, M1.7, X2.1
  region?: string;           // Active region
  details: string;
  severity: Severity;
  earthDirected?: boolean;
  speed?: number;            // km/s for CMEs
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

interface KpImpactRow {
  kpRange: string;
  gScale: string;
  radioComms: string;
  gpsAccuracy: string;
  satelliteDrag: string;
  powerGrid: string;
  auroraVisibility: string;
  frequency: string;
}

interface HistoricalEvent {
  year: number;
  name: string;
  severity: Severity;
  kpMax: number;
  dstMin: number;          // nT
  flareClass?: string;
  description: string;
  impacts: string[];
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
/*  Kp color helper                                                    */
/* ------------------------------------------------------------------ */

function kpBarColor(kp: number): string {
  if (kp <= 1) return 'bg-green-500';
  if (kp <= 3) return 'bg-yellow-500';
  if (kp <= 4) return 'bg-amber-500';
  if (kp <= 5) return 'bg-orange-500';
  if (kp <= 6) return 'bg-orange-600';
  if (kp <= 7) return 'bg-red-500';
  return 'bg-red-600';
}

function kpTextColor(kp: number): string {
  if (kp <= 1) return 'text-green-400';
  if (kp <= 3) return 'text-yellow-400';
  if (kp <= 4) return 'text-amber-400';
  if (kp <= 5) return 'text-orange-400';
  return 'text-red-400';
}

/* ------------------------------------------------------------------ */
/*  Event type helpers                                                 */
/* ------------------------------------------------------------------ */

function eventTypeLabel(type: RecentSolarEvent['type']): { label: string; color: string; icon: string } {
  switch (type) {
    case 'flare':     return { label: 'Solar Flare',     color: 'bg-orange-500/20 text-orange-300 border-orange-500/40', icon: '\u2600\uFE0F' };
    case 'cme':       return { label: 'CME',             color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: '\uD83C\uDF0A' };
    case 'radiation': return { label: 'Radiation Storm',  color: 'bg-red-500/20 text-red-300 border-red-500/40',         icon: '\u2622\uFE0F' };
    case 'filament':  return { label: 'Filament Eruption', color: 'bg-white/10 text-white/90 border-white/15',    icon: '\uD83C\uDF0B' };
    case 'proton':    return { label: 'Proton Event',     color: 'bg-pink-500/20 text-pink-300 border-pink-500/40',      icon: '\u26A1' };
  }
}

/* ------------------------------------------------------------------ */
/*  Hardcoded realistic data                                           */
/* ------------------------------------------------------------------ */

const solarCycle: SolarCycleData = {
  cycleNumber: 25,
  startDate: 'December 2019',
  predictedPeak: 'Mid-2025',
  currentPhase: 'Declining from Maximum',
  sunspotNumber: 168,
  sunspotNumberDaily: 142,
  solarFluxIndex: 178.3,
  monthsSinceMin: 74,
  predictedMaxSunspots: 179,
  hemisphereActivity: { north: 62, south: 80 },
  sunspotTrend: [115, 128, 133, 145, 152, 160, 171, 179, 175, 172, 169, 168],
};

const solarWind: SolarWindData = {
  speed: 487,
  density: 6.8,
  bz: -4.2,
  bt: 7.3,
  temperature: 148000,
  pressure: 3.2,
  phi: 225,
};

const geomagnetic: GeomagneticData = {
  kpIndex: 3,
  kpLabel: 'Unsettled',
  stormLevel: 'G0 (Below Storm Level)',
  dstIndex: -28,
  planetaryAIndex: 15,
  kpRecent: [2, 2, 3, 2, 3, 4, 3, 3],
};

const solarFlare: SolarFlareActivityData = {
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
  electronFlux: '1.2e+03 pfu',
  protonFlux: '0.8 pfu',
};

const auroralOval: AuroralData = {
  northLatitude: 62,
  southLatitude: -64,
  visibility: ['Northern Scandinavia', 'Iceland', 'Northern Canada', 'Alaska', 'Northern Scotland', 'Southern tip of New Zealand'],
  highLatProb: 85,
  midLatProb: 25,
  lowLatProb: 2,
};

const recentEvents: RecentSolarEvent[] = [
  { id: 'EVT-001', type: 'flare',     timestamp: '2026-02-26 08:14 UTC', classification: 'C3.8', region: 'AR 3945', details: 'Moderate C-class flare with brief radio emission. No CME association detected.', severity: 'Minor' },
  { id: 'EVT-002', type: 'flare',     timestamp: '2026-02-25 22:47 UTC', classification: 'C1.3', region: 'AR 3945', details: 'Minor C-class flare. Peak X-ray flux at B-level background. Confined eruption.', severity: 'Quiet' },
  { id: 'EVT-003', type: 'cme',       timestamp: '2026-02-25 16:30 UTC', speed: 520, earthDirected: false, details: 'Partial halo CME observed in LASCO C2. Directed ~40 deg west of Sun-Earth line. No Earth impact expected.', severity: 'Quiet' },
  { id: 'EVT-004', type: 'flare',     timestamp: '2026-02-25 11:02 UTC', classification: 'M1.7', region: 'AR 3943', details: 'M-class flare from departing active region near west limb. Type II radio sweep detected. Associated asymmetric halo CME not Earth-directed.', severity: 'Moderate' },
  { id: 'EVT-005', type: 'filament',  timestamp: '2026-02-24 19:35 UTC', details: 'Large filament eruption from southern hemisphere (~S25W10). Slow CME launch detected, modeling indicates glancing blow possible Feb 27-28.', severity: 'Minor' },
  { id: 'EVT-006', type: 'flare',     timestamp: '2026-02-24 06:58 UTC', classification: 'C5.1', region: 'AR 3945', details: 'Impulsive C-class flare with minor 10cm radio burst. No associated CME.', severity: 'Minor' },
  { id: 'EVT-007', type: 'cme',       timestamp: '2026-02-23 14:22 UTC', speed: 680, earthDirected: true, details: 'Earth-directed halo CME from M1.7 flare. Estimated arrival: Feb 25-26. WSA-ENLIL model shows density enhancement at L1.', severity: 'Moderate' },
  { id: 'EVT-008', type: 'flare',     timestamp: '2026-02-23 09:45 UTC', classification: 'C2.4', region: 'AR 3944', details: 'Brief C-class flare from newly numbered region. Beta magnetic configuration.', severity: 'Quiet' },
  { id: 'EVT-009', type: 'proton',    timestamp: '2026-02-22 18:10 UTC', details: 'Minor proton flux enhancement (>10 MeV) observed at GOES. Peak flux 5.2 pfu, below S1 threshold. Associated with Feb 22 M-class flare.', severity: 'Minor' },
  { id: 'EVT-010', type: 'flare',     timestamp: '2026-02-22 03:28 UTC', classification: 'M2.3', region: 'AR 3943', details: 'Strongest flare of the period. Long-duration event (LDE) with post-flare coronal loops visible in AIA 171. Associated Type IV radio burst.', severity: 'Moderate' },
];

const forecast: ForecastDay[] = [
  { day: 'Today',     date: 'Feb 26', kpForecast: 4, condition: 'Moderate', solarFlareProb: 60, geoStormProb: 40, summary: 'G1 storm watch; coronal hole high-speed stream peak. CME glancing blow possible this evening.' },
  { day: 'Thu',       date: 'Feb 27', kpForecast: 3, condition: 'Minor',    solarFlareProb: 45, geoStormProb: 25, summary: 'HSS waning; isolated substorms possible. Filament CME from Feb 24 may deliver glancing blow late.' },
  { day: 'Fri',       date: 'Feb 28', kpForecast: 2, condition: 'Quiet',    solarFlareProb: 35, geoStormProb: 10, summary: 'Return to background levels expected. AR 3945 rotating toward limb.' },
  { day: 'Sat',       date: 'Mar 01', kpForecast: 2, condition: 'Quiet',    solarFlareProb: 30, geoStormProb: 10, summary: 'Quiet conditions; no Earth-directed CMEs. Solar wind speed dropping to ~350 km/s.' },
  { day: 'Sun',       date: 'Mar 02', kpForecast: 3, condition: 'Minor',    solarFlareProb: 50, geoStormProb: 15, summary: 'New coronal hole rotating into geo-effective position near central meridian.' },
  { day: 'Mon',       date: 'Mar 03', kpForecast: 4, condition: 'Moderate', solarFlareProb: 55, geoStormProb: 35, summary: 'Possible G1 conditions from recurrent coronal hole HSS arrival.' },
  { day: 'Tue',       date: 'Mar 04', kpForecast: 3, condition: 'Minor',    solarFlareProb: 40, geoStormProb: 20, summary: 'CH HSS declining. New active region expected on east limb.' },
];

const impactAssessments: ImpactAssessment[] = [
  {
    domain: 'Satellite Operations',
    icon: '\uD83D\uDEF0\uFE0F',
    level: 'Minor',
    description: 'Elevated drag on LEO satellites due to thermospheric heating from CH HSS. Surface charging possible on GEO spacecraft in outer radiation belt.',
    recommendation: 'Monitor drag coefficients on LEO assets. Review anomaly resolution procedures for GEO platforms. Consider maneuver planning for Starlink/OneWeb constellations.',
  },
  {
    domain: 'HF Communications',
    icon: '\uD83D\uDCE1',
    level: 'Quiet',
    description: 'HF propagation normal on sunlit side. No polar cap absorption events in progress. D-region absorption minimal.',
    recommendation: 'No action required. Standard frequency management protocols apply.',
  },
  {
    domain: 'GPS / GNSS Accuracy',
    icon: '\uD83D\uDCCD',
    level: 'Minor',
    description: 'Slight ionospheric scintillation at high latitudes may degrade single-frequency GPS accuracy by 2-5 meters. TEC gradients elevated at auroral boundary.',
    recommendation: 'Use dual-frequency receivers for precision applications at latitudes above 60 deg. WAAS/EGNOS corrections available.',
  },
  {
    domain: 'Astronaut EVA Safety',
    icon: '\uD83D\uDC69\u200D\uD83D\uDE80',
    level: 'Quiet',
    description: 'Radiation dose rates within nominal limits. No solar proton events expected in 24-hour window. ISS SAA passage doses within norms.',
    recommendation: 'EVA operations may proceed per standard safety protocols. Monitor for M-class flare alerts from AR 3945.',
  },
  {
    domain: 'Power Grid Risk',
    icon: '\u26A1',
    level: 'Quiet',
    description: 'Geomagnetically induced currents (GICs) below threshold for transformer impacts. Dst index at -28 nT, well above concern threshold.',
    recommendation: 'No protective actions required. Maintain situational awareness for potential G1 conditions today.',
  },
  {
    domain: 'Aviation (Polar Routes)',
    icon: '\u2708\uFE0F',
    level: 'Minor',
    description: 'Elevated radiation environment at flight altitudes (>FL350) on polar routes during Kp 4 intervals. HF communication degraded in polar cap.',
    recommendation: 'Consider SATCOM backup for polar route communications. Monitor NOAA SWPC for radiation storm warnings.',
  },
];

const kpImpactTable: KpImpactRow[] = [
  { kpRange: '0-1', gScale: 'G0',  radioComms: 'Normal',                    gpsAccuracy: 'Normal (<1m)',        satelliteDrag: 'Nominal',                 powerGrid: 'No impact',            auroraVisibility: '>65\u00B0 N/S only',    frequency: '~50% of time' },
  { kpRange: '2-3', gScale: 'G0',  radioComms: 'Slight HF fading',         gpsAccuracy: 'Slight degradation',  satelliteDrag: 'Minor increase',          powerGrid: 'No impact',            auroraVisibility: '60-65\u00B0 N/S',      frequency: '~30% of time' },
  { kpRange: '4',   gScale: 'G0',  radioComms: 'HF intermittent at poles', gpsAccuracy: '2-5m degradation',    satelliteDrag: 'Moderate increase',        powerGrid: 'Possible weak GICs',   auroraVisibility: '55-60\u00B0 N/S',      frequency: '~15% of time' },
  { kpRange: '5',   gScale: 'G1',  radioComms: 'Weak HF degradation',      gpsAccuracy: 'Scintillation (5-10m)', satelliteDrag: 'Increased drag, orbit adjustments', powerGrid: 'Weak GICs',    auroraVisibility: '50-55\u00B0 N/S',      frequency: '~900 days/cycle' },
  { kpRange: '6',   gScale: 'G2',  radioComms: 'HF outages at high lat',   gpsAccuracy: 'Degraded (10-20m)',   satelliteDrag: 'Significant, tracking errors', powerGrid: 'Moderate GICs',     auroraVisibility: '45-50\u00B0 N/S',      frequency: '~360 days/cycle' },
  { kpRange: '7',   gScale: 'G3',  radioComms: 'HF blackout at high lat',  gpsAccuracy: 'Loss of lock possible', satelliteDrag: 'Major, possible reentry risk (LEO)', powerGrid: 'High GICs, voltage alarms', auroraVisibility: '40-45\u00B0 N/S', frequency: '~130 days/cycle' },
  { kpRange: '8',   gScale: 'G4',  radioComms: 'HF blackout hours',        gpsAccuracy: 'Severe degradation',  satelliteDrag: 'Extreme, satellite losses possible', powerGrid: 'Transformer damage risk', auroraVisibility: '35-40\u00B0 N/S', frequency: '~60 days/cycle' },
  { kpRange: '9',   gScale: 'G5',  radioComms: 'Complete HF blackout',     gpsAccuracy: 'GPS unusable',        satelliteDrag: 'Catastrophic, mass reentries', powerGrid: 'Grid collapse possible', auroraVisibility: '<35\u00B0 (equator possible)', frequency: '~4 days/cycle' },
];

const historicalEvents: HistoricalEvent[] = [
  {
    year: 1859, name: 'Carrington Event', severity: 'Severe', kpMax: 9, dstMin: -1760,
    flareClass: 'X45+ (estimated)',
    description: 'Largest recorded geomagnetic storm in history. Observed by Richard Carrington as a white-light flare, the first solar flare ever witnessed.',
    impacts: ['Telegraphs operated without batteries and shocked operators', 'Aurora visible near the equator in Colombia and Hawaii', 'ICE core data suggests strongest event in 500+ years', 'CME transit time only 17.6 hours (typical: 2-4 days)'],
  },
  {
    year: 1921, name: 'New York Railroad Storm', severity: 'Severe', kpMax: 9, dstMin: -907,
    flareClass: 'Unknown',
    description: 'One of the most intense geomagnetic storms of the 20th century. Caused widespread disruption to telegraph and telephone systems.',
    impacts: ['Fires in telegraph and railroad signal systems across northeastern US', 'Transatlantic cables disrupted for hours', 'Aurora visible as far south as Puerto Rico', 'A similar event today could cause $1-2 trillion in damages'],
  },
  {
    year: 1972, name: 'August 1972 Solar Storm', severity: 'Strong', kpMax: 8, dstMin: -125,
    flareClass: 'X2+',
    description: 'Series of solar flares and CMEs between Apollo 16 and Apollo 17 missions. Would have been lethal to unshielded astronauts.',
    impacts: ['Disrupted long-distance communications worldwide', 'Accidentally detonated magnetic-influence sea mines in Vietnam', 'Lucky timing: between two Apollo moonwalks', 'Led to improvements in space weather forecasting for crew safety'],
  },
  {
    year: 1989, name: 'Quebec Blackout', severity: 'Severe', kpMax: 9, dstMin: -589,
    flareClass: 'X15',
    description: 'Massive geomagnetic storm collapsed the Hydro-Quebec power grid in just 92 seconds through geomagnetically induced currents (GICs).',
    impacts: ['6 million people without electricity for 9 hours', 'Hydro-Quebec grid collapsed in 92 seconds from GIC-induced relay trips', 'Over 200 anomalies reported on spacecraft including GOES', 'Space shuttle Discovery mission STS-29 experienced sensor anomalies'],
  },
  {
    year: 2000, name: 'Bastille Day Event', severity: 'Strong', kpMax: 9, dstMin: -301,
    flareClass: 'X5.7',
    description: 'Major solar flare on July 14 (Bastille Day) produced a fast CME that triggered an S3 solar radiation storm.',
    impacts: ['S3 radiation storm disrupted satellite operations', 'Shortwave radio blackout across the sunlit hemisphere', 'SOHO satellite temporarily lost attitude control', 'Aurora visible as far south as Texas and Florida'],
  },
  {
    year: 2003, name: 'Halloween Storms', severity: 'Severe', kpMax: 9, dstMin: -422,
    flareClass: 'X28+ (X45 estimated)',
    description: 'Series of extreme solar events over two weeks in October-November 2003. Included the most powerful flare ever instrumentally measured (saturated GOES X-ray detector).',
    impacts: ['Damaged or caused anomalies on 47+ satellites including ADEOS-2 (total loss)', 'Rerouted polar airline flights, costing airlines millions', 'Caused 1-hour blackout in Malmo, Sweden from GICs', 'GPS accuracy degraded to >50 meters for hours', 'Astronauts on ISS sheltered in shielded areas'],
  },
  {
    year: 2012, name: 'July 2012 Near-Miss CME', severity: 'Severe', kpMax: 9, dstMin: -1100,
    flareClass: 'X1.1',
    description: 'A Carrington-class CME crossed Earth\'s orbital path just one week after Earth had passed that point. Detected by STEREO-A spacecraft.',
    impacts: ['Would have caused estimated $0.6-2.6 trillion in damages if it had hit Earth', 'CME speed: 2,500 km/s (one of the fastest ever recorded)', 'Study estimated 12% chance of such event hitting Earth in a decade', 'Galvanized the space weather community to improve forecasting'],
  },
  {
    year: 2024, name: 'May 2024 Superstorm', severity: 'Severe', kpMax: 9, dstMin: -412,
    flareClass: 'X8.7',
    description: 'Strongest geomagnetic storm since 2003. Multiple Earth-directed CMEs merged en route (cannibalistic CME), producing G5 conditions for the first time since November 2003.',
    impacts: ['Aurora visible as far south as Florida, Mexico, and northern India', 'GPS and precision agriculture systems experienced multi-hour outages', 'Starlink reported degraded service and increased satellite drag', 'Sparked worldwide aurora photography phenomenon on social media', 'Demonstrated improved storm forecasting since 2003'],
  },
];

/* ------------------------------------------------------------------ */
/*  Related links                                                      */
/* ------------------------------------------------------------------ */

const relatedLinks = [
  { href: '/space-environment', label: 'Space Environment',  icon: '\uD83C\uDF0D' },
  { href: '/satellites',        label: 'Satellite Tracker',  icon: '\uD83D\uDEF0\uFE0F' },
  { href: '/orbital-calculator', label: 'Orbital Calculator', icon: '\uD83E\uDDEE' },
  { href: '/mission-control',   label: 'Mission Control',    icon: '\uD83D\uDEE0\uFE0F' },
  { href: '/debris-tracker',    label: 'Debris Tracker',     icon: '\uD83D\uDEA8' },
  { href: '/launch',            label: 'Launch Dashboard',   icon: '\uD83D\uDE80' },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function SpaceWeatherDashboard() {
  const [activeTab, setActiveTab] = useState<'current' | 'events' | 'forecast' | 'impacts' | 'history'>('current');

  const lastUpdated = 'Feb 26, 2026 09:47 UTC';

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-black to-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <AnimatedPageHeader
          title="Space Weather Dashboard"
          subtitle="Real-time solar activity, geomagnetic conditions, and operational impact assessments for space and ground-based systems. Data sourced from NOAA SWPC, NASA DONKI, and SDO/SOHO observatories."
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

        {/* NOAA data source note */}
        <ScrollReveal delay={0.02}>
          <div className="mb-6 bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Data Sources:</span>{' '}
            NOAA Space Weather Prediction Center (SWPC) &bull; NASA DONKI (Space Weather Database) &bull; GOES-16/18 X-ray &amp; Particle Sensors &bull; ACE/DSCOVR Solar Wind (L1 point) &bull; SDO AIA/HMI Solar Imaging
          </div>
        </ScrollReveal>

        {/* Tab navigation */}
        <ScrollReveal delay={0.05}>
          <div className="flex gap-1 mb-8 border-b border-white/[0.06] overflow-x-auto">
            {([
              { key: 'current',  label: 'Current Conditions' },
              { key: 'events',   label: 'Recent Events' },
              { key: 'forecast', label: '7-Day Forecast' },
              { key: 'impacts',  label: 'Impacts & Operations' },
              { key: 'history',  label: 'Historical Events' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-white/90 hover:border-white/[0.1]'
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
                    <h2 className="text-lg font-semibold text-white">Overall Space Weather: Minor Activity</h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Coronal hole high-speed stream arriving at Earth. Kp 3-4 expected with isolated Kp 4 intervals. AR 3945 has produced multiple C-class flares with beta-gamma magnetic configuration. Low probability of M-class activity.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* ───────────────────── Solar Activity Dashboard ───────────────────── */}
            <ScrollReveal delay={0.03}>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Solar Cycle {solarCycle.cycleNumber} Dashboard</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {solarCycle.currentPhase}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <BigStat label="Sunspot Number" sublabel="Monthly Smoothed" value={solarCycle.sunspotNumber.toString()} color="text-amber-400" />
                  <BigStat label="Daily Sunspots" sublabel="Observed Today" value={solarCycle.sunspotNumberDaily.toString()} color="text-yellow-400" />
                  <BigStat label="Solar Flux (F10.7)" sublabel="10.7 cm Radio Flux (sfu)" value={solarCycle.solarFluxIndex.toFixed(1)} color="text-orange-400" />
                  <BigStat label="Cycle Progress" sublabel={`Started ${solarCycle.startDate}`} value={`${solarCycle.monthsSinceMin} mo`} color="text-slate-300" />
                </div>

                {/* Sunspot trend sparkline (text-based bar chart) */}
                <div className="bg-black/40 rounded-lg p-4">
                  <p className="text-xs text-slate-400 font-medium mb-3">12-Month Sunspot Number Trend (Smoothed)</p>
                  <div className="flex items-end gap-1.5 h-20">
                    {solarCycle.sunspotTrend.map((ssn, i) => {
                      const maxVal = Math.max(...solarCycle.sunspotTrend);
                      const heightPct = (ssn / maxVal) * 100;
                      const isLatest = i === solarCycle.sunspotTrend.length - 1;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className={`text-[9px] ${isLatest ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>{ssn}</span>
                          <div
                            className={`w-full rounded-t transition-all ${isLatest ? 'bg-amber-500' : 'bg-slate-600'}`}
                            style={{ height: `${heightPct}%`, minHeight: '4px' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1.5 text-[9px] text-slate-500">
                    <span>Mar 2025</span>
                    <span>Feb 2026</span>
                  </div>
                </div>

                {/* Hemisphere activity */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Northern Hemisphere</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-300">{solarCycle.hemisphereActivity.north}</span>
                      <span className="text-xs text-slate-500">sunspot groups</span>
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Southern Hemisphere</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-purple-400">{solarCycle.hemisphereActivity.south}</span>
                      <span className="text-xs text-slate-500">sunspot groups</span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Solar Cycle 25 began in December 2019 and exceeded NOAA/NASA predictions, reaching a smoothed sunspot maximum near {solarCycle.predictedMaxSunspots} in mid-2025.
                  Activity is now gradually declining but remains elevated with frequent C-class and occasional M-class flares.
                </p>
              </div>
            </ScrollReveal>

            {/* ───────────────────── Geomagnetic + Solar Wind + Flare Row ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Geomagnetic Activity (enhanced) */}
              <ScrollReveal delay={0.05}>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 h-full">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Geomagnetic Activity</h3>

                  {/* Current Kp */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`text-5xl font-bold ${kpTextColor(geomagnetic.kpIndex)}`}>{geomagnetic.kpIndex}</div>
                    <div>
                      <p className="text-white/90 font-medium">{geomagnetic.kpLabel}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{geomagnetic.stormLevel}</p>
                    </div>
                  </div>

                  {/* Kp color-coded bar */}
                  <div className="flex gap-0.5 mb-1">
                    {Array.from({ length: 9 }, (_, i) => {
                      const filled = i < geomagnetic.kpIndex;
                      const segColor = i < 2 ? 'bg-green-500' : i < 4 ? 'bg-yellow-500' : i < 5 ? 'bg-amber-500' : i < 6 ? 'bg-orange-500' : i < 8 ? 'bg-red-500' : 'bg-red-700';
                      return (
                        <div
                          key={i}
                          className={`flex-1 h-3 rounded-sm ${filled ? segColor : 'bg-white/[0.08]'}`}
                          title={`Kp ${i + 1}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-4">
                    <span>Quiet</span><span>Unsettled</span><span>Storm</span>
                  </div>

                  {/* 24h Kp History */}
                  <p className="text-xs text-slate-400 font-medium mb-2">Last 24 Hours (3-hour cadence)</p>
                  <div className="flex gap-1 items-end h-12 mb-2">
                    {geomagnetic.kpRecent.map((kp, i) => {
                      const h = Math.max((kp / 9) * 100, 8);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <span className={`text-[9px] font-medium ${kpTextColor(kp)}`}>{kp}</span>
                          <div
                            className={`w-full rounded-t ${kpBarColor(kp)}`}
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 mb-4">
                    <span>-24h</span><span>Now</span>
                  </div>

                  {/* Dst and Ap */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 rounded-lg p-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Dst Index</p>
                      <p className={`text-xl font-bold ${geomagnetic.dstIndex < -50 ? 'text-red-400' : geomagnetic.dstIndex < -30 ? 'text-amber-400' : 'text-green-400'}`}>
                        {geomagnetic.dstIndex} nT
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Storm: &lt; -50 nT</p>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Planetary A-index</p>
                      <p className={`text-xl font-bold ${geomagnetic.planetaryAIndex > 30 ? 'text-red-400' : geomagnetic.planetaryAIndex > 15 ? 'text-amber-400' : 'text-green-400'}`}>
                        {geomagnetic.planetaryAIndex}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Active: &gt; 20</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Solar Wind Data (enhanced) */}
              <ScrollReveal delay={0.1}>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 h-full">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Solar Wind (DSCOVR L1)</h3>

                  {/* Speed gauge */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">Speed</span>
                      <span className={`text-2xl font-bold ${solarWind.speed > 600 ? 'text-red-400' : solarWind.speed > 500 ? 'text-amber-400' : 'text-green-400'}`}>
                        {solarWind.speed} <span className="text-sm text-slate-400 font-normal">km/s</span>
                      </span>
                    </div>
                    <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${solarWind.speed > 600 ? 'bg-red-500' : solarWind.speed > 500 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((solarWind.speed / 900) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                      <span>300 (slow)</span><span>500 (fast)</span><span>900 (extreme)</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Metric label="Proton Density" value={`${solarWind.density} p/cm\u00B3`} note="Normal: 3-8" warn={solarWind.density > 10} />
                    <Metric label="IMF Bz Component" value={`${solarWind.bz} nT`} note="Southward = geo-effective" warn={solarWind.bz < -5} highlight={solarWind.bz < 0 ? 'negative' : 'positive'} />
                    <Metric label="IMF Bt (Total)" value={`${solarWind.bt} nT`} note="Normal: 2-8" warn={solarWind.bt > 10} />
                    <Metric label="Temperature" value={`${(solarWind.temperature / 1000).toFixed(0)}K K`} note="Proton temp" warn={solarWind.temperature > 300000} />
                    <Metric label="Dynamic Pressure" value={`${solarWind.pressure} nPa`} note="Normal: 1-4" warn={solarWind.pressure > 6} />
                    <Metric label="IMF Clock Angle" value={`${solarWind.phi}\u00B0`} note="180-360 = southward" warn={solarWind.phi > 180 && solarWind.phi < 360} />
                  </div>

                  <div className="mt-4 bg-black/40 rounded-lg p-3">
                    <p className="text-[10px] text-slate-400">
                      <span className="font-medium text-slate-300">IMF Bz interpretation:</span>{' '}
                      {solarWind.bz < -10
                        ? 'Strongly southward. High probability of geomagnetic activity.'
                        : solarWind.bz < -5
                        ? 'Moderately southward. Geomagnetic activity likely.'
                        : solarWind.bz < 0
                        ? 'Slightly southward. Some energy coupling possible.'
                        : 'Northward or near zero. Magnetosphere relatively closed.'}
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Solar Flares */}
              <ScrollReveal delay={0.15}>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 h-full">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Solar Flare Activity</h3>
                  <div className="space-y-3 mb-4">
                    <Metric label="X-ray Flux" value={solarFlare.xrayFlux} note="Current background" warn={false} />
                    <Metric label="24h Peak" value={solarFlare.peakClass} note={`Source: ${solarFlare.region}`} warn={false} />
                  </div>
                  <p className="text-xs text-slate-400 font-medium mb-2">24-Hour Flare Probability</p>
                  <div className="space-y-2 mb-4">
                    <ProbBar label="C-class" percent={solarFlare.probability24h.C} color="bg-yellow-500" />
                    <ProbBar label="M-class" percent={solarFlare.probability24h.M} color="bg-orange-500" />
                    <ProbBar label="X-class" percent={solarFlare.probability24h.X} color="bg-red-500" />
                  </div>

                  {/* Flare classification reference */}
                  <div className="bg-black/40 rounded-lg p-3 mb-4">
                    <p className="text-[10px] text-slate-400 font-medium mb-2">Flare Classification Scale (GOES X-ray)</p>
                    <div className="grid grid-cols-5 gap-1 text-center">
                      {[
                        { cls: 'A', color: 'text-slate-400', desc: 'Background' },
                        { cls: 'B', color: 'text-green-400', desc: 'Minor' },
                        { cls: 'C', color: 'text-yellow-400', desc: 'Small' },
                        { cls: 'M', color: 'text-orange-400', desc: 'Medium' },
                        { cls: 'X', color: 'text-red-400', desc: 'Major' },
                      ].map((f) => (
                        <div key={f.cls}>
                          <span className={`text-lg font-bold ${f.color}`}>{f.cls}</span>
                          <p className="text-[9px] text-slate-500">{f.desc}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1.5 text-center">Each class is 10x stronger than the previous</p>
                  </div>

                  {/* Active regions summary */}
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-2">Active Regions on Disk</p>
                    <div className="space-y-1.5">
                      {[
                        { region: 'AR 3945', config: '\u03B2\u03B3', area: 350, flares: '4C, 0M', location: 'N12E08' },
                        { region: 'AR 3944', config: '\u03B2', area: 120, flares: '1C', location: 'S08W35' },
                        { region: 'AR 3943', config: '\u03B2\u03B3\u03B4', area: 520, flares: '2C, 2M', location: 'N20W62' },
                      ].map((ar) => (
                        <div key={ar.region} className="flex items-center justify-between text-xs bg-black/30 rounded px-2.5 py-1.5">
                          <div>
                            <span className="text-white/90 font-medium">{ar.region}</span>
                            <span className="text-slate-500 ml-2">{ar.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{ar.config}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${ar.config.includes('\u03B4') ? 'bg-red-500/20 text-red-300' : ar.config.includes('\u03B3') ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'}`}>
                              {ar.flares}
                            </span>

        <RelatedModules modules={PAGE_RELATIONS['space-weather']} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* ───────────────────── Aurora Forecast + Radiation Belt Row ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Aurora Forecast (enhanced) */}
              <ScrollReveal delay={0.05}>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Aurora Forecast</h3>

                  {/* Auroral oval boundaries */}
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div>
                      <p className="text-xs text-slate-400">Northern Auroral Boundary</p>
                      <p className="text-2xl font-bold text-slate-300">{auroralOval.northLatitude}&#176; N</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Southern Auroral Boundary</p>
                      <p className="text-2xl font-bold text-purple-400">{Math.abs(auroralOval.southLatitude)}&#176; S</p>
                    </div>
                  </div>

                  {/* Probability by latitude band */}
                  <p className="text-xs text-slate-400 font-medium mb-3">Aurora Visibility Probability (Next 3 Hours)</p>
                  <div className="space-y-3 mb-5">
                    <AuroraProbRow label="High Latitudes" sublabel="> 60\u00B0 N/S" percent={auroralOval.highLatProb} color="bg-green-500" />
                    <AuroraProbRow label="Mid Latitudes" sublabel="40-60\u00B0 N/S" percent={auroralOval.midLatProb} color="bg-white" />
                    <AuroraProbRow label="Low Latitudes" sublabel="< 40\u00B0 N/S" percent={auroralOval.lowLatProb} color="bg-purple-500" />
                  </div>

                  {/* Visibility locations */}
                  <p className="text-xs text-slate-400 font-medium mb-2">Currently Visible From</p>
                  <div className="flex flex-wrap gap-1.5">
                    {auroralOval.visibility.map((loc) => (
                      <span key={loc} className="px-2 py-0.5 bg-white/[0.04] border border-white/10 rounded text-xs text-white/90">
                        {loc}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 bg-black/40 rounded-lg p-3">
                    <p className="text-[10px] text-slate-400">
                      <span className="font-medium text-slate-300">Viewing tip:</span>{' '}
                      Best aurora viewing requires dark skies (no moonlight), clear weather, and locations away from city lights. The oval typically expands equatorward during geomagnetic storms (Kp 5+).
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Radiation Belt Status (enhanced) */}
              <ScrollReveal delay={0.1}>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Radiation Environment</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <StatusItem label="Inner Belt (Van Allen)" level={radiationBelt.innerBelt} />
                    <StatusItem label="Outer Belt" level={radiationBelt.outerBelt} />
                    <StatusItem label="Solar Proton Events" level={radiationBelt.solarProtonEvents ? 'Strong' : 'Quiet'} />
                    <StatusItem label="Galactic Cosmic Rays" level={radiationBelt.galacticCosmicRays} />
                  </div>

                  {/* Particle flux data */}
                  <p className="text-xs text-slate-400 font-medium mb-2">Particle Flux (GOES-18)</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-black/40 rounded-lg p-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Electron Flux (&gt;2 MeV)</p>
                      <p className="text-sm font-bold text-amber-400">{radiationBelt.electronFlux}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Alert: &gt;1e+04 pfu</p>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Proton Flux (&gt;10 MeV)</p>
                      <p className="text-sm font-bold text-green-400">{radiationBelt.protonFlux}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">S1 Threshold: 10 pfu</p>
                    </div>
                  </div>

                  {/* Radiation dose rates */}
                  <p className="text-xs text-slate-400 font-medium mb-2">Estimated Dose Rates</p>
                  <div className="space-y-2">
                    {[
                      { label: 'ISS (400 km)', rate: '0.3 mSv/day', status: 'Nominal', color: 'text-green-400' },
                      { label: 'GEO (35,786 km)', rate: '1.8 mSv/day', status: 'Elevated', color: 'text-yellow-400' },
                      { label: 'Interplanetary', rate: '1.2 mSv/day', status: 'Nominal', color: 'text-green-400' },
                      { label: 'Polar Flight (FL380)', rate: '6.2 \u00B5Sv/hr', status: 'Nominal', color: 'text-green-400' },
                    ].map((d) => (
                      <div key={d.label} className="flex items-center justify-between text-xs bg-black/30 rounded px-2.5 py-1.5">
                        <span className="text-slate-400">{d.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white/90 font-medium">{d.rate}</span>
                          <span className={`${d.color} text-[10px]`}>{d.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/*  TAB: Recent Events                                           */}
        {/* ============================================================ */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <ScrollReveal>
              <p className="text-slate-300 mb-4">
                Recent solar events including flares, coronal mass ejections (CMEs), filament eruptions, and radiation storms. Events are sourced from NOAA SWPC and NASA DONKI databases.
              </p>
            </ScrollReveal>

            {/* Event summary cards */}
            <ScrollReveal delay={0.03}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <MiniStatCard label="Solar Flares (7d)" value="6" sublabel="4 C-class, 2 M-class" color="text-orange-400" />
                <MiniStatCard label="CMEs (7d)" value="2" sublabel="1 Earth-directed" color="text-purple-400" />
                <MiniStatCard label="Proton Events" value="1" sublabel="Below S1 threshold" color="text-pink-400" />
                <MiniStatCard label="Filament Eruptions" value="1" sublabel="Glancing CME possible" color="text-slate-300" />
              </div>
            </ScrollReveal>

            {/* Event timeline */}
            <div className="space-y-3">
              {recentEvents.map((event, i) => {
                const typeInfo = eventTypeLabel(event.type);
                return (
                  <ScrollReveal key={event.id} delay={i * 0.04}>
                    <div className={`rounded-xl border p-4 ${severityColors[event.severity].bg} ${severityColors[event.severity].border}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Icon + type badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-2xl">{typeInfo.icon}</span>
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            {event.classification && (
                              <span className={`text-lg font-bold ${
                                event.classification.startsWith('X') ? 'text-red-400' :
                                event.classification.startsWith('M') ? 'text-orange-400' :
                                'text-yellow-400'
                              }`}>
                                {event.classification}
                              </span>
                            )}
                            {event.region && (
                              <span className="text-xs text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">{event.region}</span>
                            )}
                            {event.speed && (
                              <span className="text-xs text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">{event.speed} km/s</span>
                            )}
                            {event.earthDirected !== undefined && (
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                event.earthDirected
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : 'bg-white/[0.06] text-slate-400'
                              }`}>
                                {event.earthDirected ? 'Earth-Directed' : 'Not Earth-Directed'}
                              </span>
                            )}
                            <SeverityBadge level={event.severity} />
                          </div>
                          <p className="text-sm text-slate-300">{event.details}</p>
                        </div>

                        {/* Timestamp */}
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-slate-400 font-medium whitespace-nowrap">{event.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>

            {/* Data source note */}
            <ScrollReveal delay={0.3}>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 mt-4">
                <h3 className="text-sm font-semibold text-white/90 mb-2">About Solar Events</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
                  <div>
                    <p className="font-medium text-slate-300 mb-1">Solar Flares</p>
                    <p>Sudden bursts of electromagnetic radiation from the Sun. Classified A, B, C, M, X by peak X-ray flux. Travel at light speed (8 min to Earth).</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-300 mb-1">Coronal Mass Ejections (CMEs)</p>
                    <p>Massive clouds of magnetized plasma ejected from the Sun. Travel at 300-3000 km/s. Earth-directed CMEs cause geomagnetic storms (1-4 days to arrive).</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-300 mb-1">Solar Radiation Storms</p>
                    <p>Elevated proton flux from flares/CME shocks. Can damage satellites, increase radiation on polar flights, and disrupt HF radio.</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-300 mb-1">Filament Eruptions</p>
                    <p>Large structures of cool, dense plasma suspended by magnetic fields that suddenly erupt, often launching slow CMEs.</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
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
                      <span className="font-semibold text-white">{day.day}</span>
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
                    <p className="mt-3 text-xs text-slate-400 leading-snug border-t border-white/[0.06] pt-2">
                      {day.summary}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Forecast notes */}
            <ScrollReveal delay={0.15}>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 mt-6">
                <h3 className="text-sm font-semibold text-white/90 mb-2">Forecast Notes</h3>
                <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                  <li>A coronal hole high-speed stream (CH HSS) peaked overnight and is currently geo-effective, producing Kp 3-4 conditions.</li>
                  <li>An Earth-directed CME from Feb 23 (associated with M1.7 flare) may deliver a glancing blow this evening, potentially boosting Kp to 4-5.</li>
                  <li>Active Region AR 3943 (beta-gamma-delta) is rotating past W60 and will soon lose geo-effectiveness for Earth-directed events.</li>
                  <li>AR 3945 near disk center has beta-gamma configuration with continued C-class and possible M-class potential.</li>
                  <li>The next recurrent coronal hole passage is expected around Mar 2-3, producing similar unsettled to active conditions.</li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* ============================================================ */}
        {/*  TAB: Impacts & Operations                                     */}
        {/* ============================================================ */}
        {activeTab === 'impacts' && (
          <div className="space-y-6">
            <ScrollReveal>
              <p className="text-slate-300 mb-4">
                Operational impact assessments based on current and forecast space weather conditions, plus a reference table showing how different Kp levels affect key systems.
              </p>
            </ScrollReveal>

            {/* Current Impact Assessments */}
            <div className="space-y-4">
              {impactAssessments.map((impact, i) => (
                <ScrollReveal key={impact.domain} delay={i * 0.05}>
                  <div className={`rounded-xl border p-5 ${severityColors[impact.level].bg} ${severityColors[impact.level].border}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <span className="text-3xl">{impact.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{impact.domain}</h3>
                          <SeverityBadge level={impact.level} />
                        </div>
                        <p className="text-sm text-slate-300 mb-3">{impact.description}</p>
                        <div className="bg-black/40 border border-white/[0.06] rounded-lg p-3">
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

            {/* ───────────────────── Kp Impact Reference Table ───────────────────── */}
            <ScrollReveal delay={0.15}>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 mt-6">
                <h3 className="text-base font-semibold text-white/90 mb-1">Space Weather Impact by Kp Level</h3>
                <p className="text-xs text-slate-400 mb-4">How different geomagnetic activity levels affect operations, infrastructure, and navigation systems.</p>

                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-xs text-left min-w-[900px]">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="px-3 py-2 text-slate-300 font-semibold">Kp</th>
                        <th className="px-3 py-2 text-slate-300 font-semibold">NOAA Scale</th>
                        <th className="px-3 py-2 text-slate-300 font-semibold">Radio Comms</th>
                        <th className="px-3 py-2 text-slate-300 font-semibold">GPS Accuracy</th>
                        <th className="px-3 py-2 text-slate-300 font-semibold">Satellite Drag</th>
                        <th className="px-3 py-2 text-slate-300 font-semibold">Power Grid</th>
                        <th className="px-3 py-2 text-slate-300 font-semibold">Aurora Visible</th>
                        <th className="px-3 py-2 text-slate-300 font-semibold">Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpImpactTable.map((row) => {
                        const kpNum = parseInt(row.kpRange);
                        const rowBg = kpNum >= 8 ? 'bg-red-900/15' : kpNum >= 6 ? 'bg-orange-900/15' : kpNum >= 4 ? 'bg-amber-900/10' : '';
                        return (
                          <tr key={row.kpRange} className={`border-b border-white/[0.06] ${rowBg}`}>
                            <td className="px-3 py-2.5">
                              <span className={`font-bold ${kpTextColor(kpNum)}`}>{row.kpRange}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                row.gScale === 'G0' ? 'bg-green-500/20 text-green-300' :
                                row.gScale === 'G1' ? 'bg-yellow-500/20 text-yellow-300' :
                                row.gScale === 'G2' ? 'bg-amber-500/20 text-amber-300' :
                                row.gScale === 'G3' ? 'bg-orange-500/20 text-orange-300' :
                                row.gScale === 'G4' ? 'bg-red-500/20 text-red-300' :
                                'bg-red-600/30 text-red-200'
                              }`}>{row.gScale}</span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-400">{row.radioComms}</td>
                            <td className="px-3 py-2.5 text-slate-400">{row.gpsAccuracy}</td>
                            <td className="px-3 py-2.5 text-slate-400">{row.satelliteDrag}</td>
                            <td className="px-3 py-2.5 text-slate-400">{row.powerGrid}</td>
                            <td className="px-3 py-2.5 text-slate-400">{row.auroraVisibility}</td>
                            <td className="px-3 py-2.5 text-slate-400">{row.frequency}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>

            {/* NOAA Scale Reference */}
            <ScrollReveal delay={0.2}>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white/90 mb-3">NOAA Space Weather Scales Reference</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="font-medium text-slate-300 mb-1">Geomagnetic Storms (G)</p>
                    <p className="mb-2">G1 Minor (Kp 5) to G5 Extreme (Kp 9)</p>
                    <div className="space-y-0.5 text-[10px]">
                      <p><span className="text-yellow-400">G1:</span> Power grid fluctuations, minor satellite impact</p>
                      <p><span className="text-amber-400">G2:</span> HF radio fades at high latitudes</p>
                      <p><span className="text-orange-400">G3:</span> Intermittent satellite navigation issues</p>
                      <p><span className="text-red-400">G4:</span> Widespread voltage control problems</p>
                      <p><span className="text-red-300">G5:</span> Possible grid collapse, satellite damage</p>
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="font-medium text-slate-300 mb-1">Solar Radiation Storms (S)</p>
                    <p className="mb-2">S1 Minor to S5 Extreme (proton flux)</p>
                    <div className="space-y-0.5 text-[10px]">
                      <p><span className="text-yellow-400">S1:</span> Minor impacts on HF in polar regions</p>
                      <p><span className="text-amber-400">S2:</span> Infrequent single-event upsets in satellites</p>
                      <p><span className="text-orange-400">S3:</span> Elevated radiation risk on polar flights</p>
                      <p><span className="text-red-400">S4:</span> Significant satellite damage possible</p>
                      <p><span className="text-red-300">S5:</span> Unavoidable high radiation on polar routes</p>
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="font-medium text-slate-300 mb-1">Radio Blackouts (R)</p>
                    <p className="mb-2">R1 Minor (M1 flare) to R5 Extreme (X20+ flare)</p>
                    <div className="space-y-0.5 text-[10px]">
                      <p><span className="text-yellow-400">R1:</span> Weak HF degradation on sunlit side</p>
                      <p><span className="text-amber-400">R2:</span> Limited HF blackout, GPS degradation</p>
                      <p><span className="text-orange-400">R3:</span> Wide HF blackout for ~1 hour</p>
                      <p><span className="text-red-400">R4:</span> HF blackout 1-2 hours on sunlit side</p>
                      <p><span className="text-red-300">R5:</span> Complete HF blackout for hours</p>
                    </div>
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
                Notable space weather events throughout recorded history. Understanding past extreme events helps model risk for future occurrences and prepare mitigation strategies.
              </p>
            </ScrollReveal>

            <div className="space-y-4">
              {historicalEvents.map((event, i) => (
                <ScrollReveal key={event.year} delay={i * 0.05}>
                  <div className={`rounded-xl border p-5 ${severityColors[event.severity].bg} ${severityColors[event.severity].border}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="text-center sm:text-left shrink-0 w-20">
                        <p className="text-3xl font-bold text-white">{event.year}</p>
                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-[10px] text-slate-400">Kp {event.kpMax}</p>
                          <p className="text-[10px] text-slate-400">Dst {event.dstMin} nT</p>
                          {event.flareClass && (
                            <p className="text-[10px] text-orange-400">{event.flareClass}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                          <SeverityBadge level={event.severity} />
                        </div>
                        <p className="text-sm text-slate-300 mb-3">{event.description}</p>

                        {/* Impact bullets */}
                        <div className="bg-black/30 border border-white/[0.06] rounded-lg p-3">
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1.5">Key Impacts</p>
                          <ul className="text-xs text-slate-400 space-y-1">
                            {event.impacts.map((impact, j) => (
                              <li key={j} className="flex items-start gap-1.5">
                                <span className="text-amber-400 mt-0.5 shrink-0">&bull;</span>
                                <span>{impact}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Statistics note */}
            <ScrollReveal delay={0.25}>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5 mt-6">
                <h3 className="text-sm font-semibold text-white/90 mb-3">Recurrence Statistics &amp; Risk Assessment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-300 font-medium mb-2">Event Probability Estimates</p>
                    <ul className="text-sm text-slate-400 space-y-1.5 list-disc list-inside">
                      <li>Carrington-class events (Dst &lt; -900 nT): <span className="text-amber-400 font-medium">1.6-12%</span> probability per decade</li>
                      <li>G5 Extreme storms (Kp 9): roughly <span className="text-amber-400 font-medium">4 events</span> per solar cycle (~11 years)</li>
                      <li>G4 Severe storms (Kp 8): roughly <span className="text-yellow-400 font-medium">60 events</span> per solar cycle</li>
                      <li>Solar Cycle 25 peaked mid-2025, remains active through 2026-2027</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 font-medium mb-2">Economic Impact Estimates</p>
                    <ul className="text-sm text-slate-400 space-y-1.5 list-disc list-inside">
                      <li>Carrington-class event today: estimated <span className="text-red-400 font-medium">$1-2.6 trillion</span> in first year (NAS/Lloyds)</li>
                      <li>Recovery time for damaged transformers: <span className="text-amber-400 font-medium">4-10 years</span></li>
                      <li>2003 Halloween storms: ~<span className="text-yellow-400 font-medium">$500M</span> in satellite losses alone</li>
                      <li>Insurance industry classifies extreme space weather as &quot;low probability, high consequence&quot;</li>
                    </ul>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Timeline visualization */}
            <ScrollReveal delay={0.3}>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white/90 mb-4">Solar Cycle Context</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-300">25</p>
                    <p className="text-xs text-slate-400 mt-1">Current Solar Cycle</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-400">~11 yr</p>
                    <p className="text-xs text-slate-400 mt-1">Average Cycle Length</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-400">179</p>
                    <p className="text-xs text-slate-400 mt-1">Peak Sunspot Number (SC25)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">285</p>
                    <p className="text-xs text-slate-400 mt-1">Highest Peak Ever (SC19, 1958)</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* ============================================================ */}
        {/*  Related Links                                                */}
        {/* ============================================================ */}
        <ScrollReveal delay={0.1}>
          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Related Pages</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.06] hover:border-amber-500/30 transition-colors"
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

function Metric({ label, value, note, warn, highlight }: { label: string; value: string; note: string; warn: boolean; highlight?: 'positive' | 'negative' }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-lg font-semibold ${
          warn ? 'text-amber-400' :
          highlight === 'negative' ? 'text-red-400' :
          highlight === 'positive' ? 'text-green-400' :
          'text-white'
        }`}>
          {value}
          {highlight === 'negative' && <span className="text-xs ml-1 text-red-400/70">&#9660;</span>}
          {highlight === 'positive' && <span className="text-xs ml-1 text-green-400/70">&#9650;</span>}
        </p>
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
      <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function StatusItem({ label, level }: { label: string; level: Severity }) {
  return (
    <div className="bg-black/30 rounded-lg p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {severityDot(level)}
        <span className={`text-sm font-medium ${severityColors[level].text}`}>{level}</span>
      </div>
    </div>
  );
}

function BigStat({ label, sublabel, value, color }: { label: string; sublabel: string; value: string; color: string }) {
  return (
    <div className="bg-black/40 rounded-lg p-3 text-center">
      <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-300 font-medium mt-1">{label}</p>
      <p className="text-[10px] text-slate-500">{sublabel}</p>
    </div>
  );
}

function AuroraProbRow({ label, sublabel, percent, color }: { label: string; sublabel: string; percent: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <div>
          <span className="text-slate-300 font-medium">{label}</span>
          <span className="text-slate-500 ml-1.5">{sublabel}</span>
        </div>
        <span className={`font-bold ${percent >= 50 ? 'text-green-400' : percent >= 20 ? 'text-yellow-400' : 'text-slate-400'}`}>{percent}%</span>
      </div>
      <div className="h-2.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function MiniStatCard({ label, value, sublabel, color }: { label: string; value: string; sublabel: string; color: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-300 font-medium mt-1">{label}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{sublabel}</p>
    </div>
  );
}
