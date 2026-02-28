'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface FrequencyBand {
  name: string;
  range: string;
  primaryUse: string;
  allocation: string;
  services: string[];
  advantages: string[];
  disadvantages: string[];
  regulatoryBody: string;
  keyUsers: string[];
  color: string;
  freqStartGHz: number;
  freqEndGHz: number;
}

// ────────────────────────────────────────
// Data — 15 frequency bands
// ────────────────────────────────────────

const FREQUENCY_BANDS: FrequencyBand[] = [
  {
    name: 'UHF',
    range: '300 MHz - 3 GHz',
    primaryUse: 'Telemetry & Mobile Satellite',
    allocation: 'Primary: Mobile Satellite Service (MSS), Meteorological Satellite',
    services: ['Telemetry tracking & command (TT&C)', 'Mobile satellite service', 'Search & rescue (COSPAS-SARSAT)', 'Amateur satellite'],
    advantages: ['Excellent propagation through atmosphere', 'Low rain attenuation', 'Simple antenna requirements', 'Good building penetration'],
    disadvantages: ['Limited bandwidth available', 'Congested spectrum', 'Low data rates', 'Susceptible to urban interference'],
    regulatoryBody: 'ITU-R',
    keyUsers: ['NOAA', 'COSPAS-SARSAT', 'Orbcomm', 'Military UHF SATCOM'],
    color: '#ef4444',
    freqStartGHz: 0.3,
    freqEndGHz: 3.0,
  },
  {
    name: 'L-band',
    range: '1 - 2 GHz',
    primaryUse: 'Navigation & MSS',
    allocation: 'Primary: Radionavigation Satellite Service (RNSS), MSS',
    services: ['GPS / GNSS navigation', 'Inmarsat mobile comms', 'Iridium voice & data', 'ADS-B aircraft tracking'],
    advantages: ['Low atmospheric attenuation', 'Omnidirectional reception possible', 'Proven reliability for GNSS', 'Good foliage penetration'],
    disadvantages: ['Limited bandwidth per channel', 'Increasing interference from terrestrial 5G', 'Low throughput for data services', 'Shared with aviation radar'],
    regulatoryBody: 'ITU-R / FCC / ICAO',
    keyUsers: ['GPS / Galileo / GLONASS / BeiDou', 'Inmarsat', 'Iridium', 'Ligado Networks'],
    color: '#f97316',
    freqStartGHz: 1.0,
    freqEndGHz: 2.0,
  },
  {
    name: 'S-band',
    range: '2 - 4 GHz',
    primaryUse: 'Weather Radar & Spacecraft Comms',
    allocation: 'Primary: Space Operation, Earth Exploration Satellite Service',
    services: ['ISS communications', 'TDRS relay links', 'Weather radar (NEXRAD)', 'Starlink TT&C'],
    advantages: ['Good balance of bandwidth and propagation', 'Moderate rain resilience', 'Well-established ground infrastructure', 'NASA Deep Space Network support'],
    disadvantages: ['Growing 5G/Wi-Fi interference', 'Moderate antenna size required', 'Limited bandwidth for HTS', 'Sharing issues with radar systems'],
    regulatoryBody: 'ITU-R / FCC / NASA',
    keyUsers: ['NASA (ISS, TDRS)', 'SpaceX (Starlink TT&C)', 'ESA', 'Indian Space Research Org'],
    color: '#eab308',
    freqStartGHz: 2.0,
    freqEndGHz: 4.0,
  },
  {
    name: 'C-band',
    range: '4 - 8 GHz',
    primaryUse: 'Fixed Satellite Service',
    allocation: 'Primary: Fixed Satellite Service (FSS), Fixed Service',
    services: ['Video distribution & broadcast', 'VSAT networks', 'Telephony backhaul', 'Weather satellite downlinks (GOES)'],
    advantages: ['Excellent rain fade resilience', 'Mature technology ecosystem', 'Wide coverage footprints', 'High link availability (>99.99%)'],
    disadvantages: ['5G C-band clearing (3.7-3.98 GHz) reduced spectrum', 'Large antenna requirements (2-3m)', 'Terrestrial interference risk', 'Lower throughput vs higher bands'],
    regulatoryBody: 'ITU-R / FCC',
    keyUsers: ['SES', 'Intelsat', 'NOAA (GOES)', 'Cable TV distribution'],
    color: '#22c55e',
    freqStartGHz: 4.0,
    freqEndGHz: 8.0,
  },
  {
    name: 'X-band',
    range: '8 - 12 GHz',
    primaryUse: 'Military SATCOM & Earth Observation',
    allocation: 'Primary: Fixed Satellite, Earth Exploration Satellite, Space Research',
    services: ['Military wideband SATCOM (WGS)', 'Synthetic aperture radar (SAR)', 'Earth observation downlinks', 'Deep space communications'],
    advantages: ['Dedicated military allocations', 'Good resolution for radar imaging', 'Less commercial congestion', 'NASA DSN compatibility'],
    disadvantages: ['Restricted access (government-priority)', 'Moderate rain attenuation', 'Expensive ground segment', 'Limited commercial availability'],
    regulatoryBody: 'ITU-R / NTIA / DoD',
    keyUsers: ['US DoD (WGS)', 'NASA (Deep Space Network)', 'ESA Copernicus', 'NRO / NGA'],
    color: '#06b6d4',
    freqStartGHz: 8.0,
    freqEndGHz: 12.0,
  },
  {
    name: 'Ku-band',
    range: '12 - 18 GHz',
    primaryUse: 'Direct Broadcast & VSAT',
    allocation: 'Primary: Fixed Satellite Service, Broadcasting Satellite Service',
    services: ['Direct-to-home TV (DTH)', 'VSAT enterprise networks', 'Maritime & aero broadband', 'Starlink user downlinks'],
    advantages: ['Smaller antennas (60-90cm dishes)', 'High commercial availability', 'Well-suited for consumer services', 'Extensive orbital slot assignments'],
    disadvantages: ['Significant rain fade in tropical regions', 'Orbital slot congestion at GEO', 'Interference between adjacent satellites', 'Power limitations for small terminals'],
    regulatoryBody: 'ITU-R / FCC / Ofcom',
    keyUsers: ['SpaceX (Starlink)', 'SES', 'Hughes (Jupiter)', 'DirecTV / Dish Network'],
    color: '#3b82f6',
    freqStartGHz: 12.0,
    freqEndGHz: 18.0,
  },
  {
    name: 'K-band',
    range: '18 - 26.5 GHz',
    primaryUse: 'Satellite Crosslinks & Research',
    allocation: 'Primary: Fixed Satellite, Inter-Satellite Service',
    services: ['Inter-satellite links', 'Radio astronomy (22.2 GHz water line)', 'Experimental communications', 'Earth observation radiometry'],
    advantages: ['Available spectrum for crosslinks', 'Useful for radiometry/science', 'Less commercial competition', 'Moderate antenna gains achievable'],
    disadvantages: ['Severe water vapor absorption at 22 GHz', 'High rain attenuation', 'Limited commercial equipment', 'Atmospheric window restrictions'],
    regulatoryBody: 'ITU-R',
    keyUsers: ['Radio astronomers', 'ESA (inter-satellite)', 'NOAA radiometers', 'Research institutions'],
    color: '#6366f1',
    freqStartGHz: 18.0,
    freqEndGHz: 26.5,
  },
  {
    name: 'Ka-band',
    range: '26.5 - 40 GHz',
    primaryUse: 'High Throughput Satellites',
    allocation: 'Primary: Fixed Satellite Service, Inter-Satellite Service',
    services: ['High throughput satellite (HTS) user links', 'Starlink & Kuiper gateway links', 'Military SATCOM (AEHF/WGS)', 'Next-gen GEO broadband'],
    advantages: ['Massive bandwidth availability (3.5 GHz+)', 'Small user terminals possible', 'Frequency reuse with spot beams', 'Ideal for Gbps-class links'],
    disadvantages: ['Severe rain fade (8-12 dB in heavy rain)', 'Requires adaptive coding & modulation', 'Higher powered amplifiers needed', 'Complex ground terminal design'],
    regulatoryBody: 'ITU-R / FCC',
    keyUsers: ['SpaceX (Starlink gateways)', 'Amazon (Kuiper)', 'ViaSat', 'US DoD (AEHF)'],
    color: '#8b5cf6',
    freqStartGHz: 26.5,
    freqEndGHz: 40.0,
  },
  {
    name: 'Q-band',
    range: '33 - 50 GHz',
    primaryUse: 'Experimental Satellite Links',
    allocation: 'Primary: Fixed Satellite Service (planned), Space Research',
    services: ['Next-gen feeder links', 'Experimental high-capacity comms', 'Propagation research', 'Future mega-constellation gateways'],
    advantages: ['Large contiguous bandwidth blocks', 'Less congested than Ka-band', 'Potential for very high data rates', 'Future-proof spectrum investment'],
    disadvantages: ['Atmospheric attenuation above 40 GHz', 'Immature component ecosystem', 'Expensive R&D costs', 'Limited flight heritage'],
    regulatoryBody: 'ITU-R / FCC (experimental)',
    keyUsers: ['ESA (Alphasat Q/V experiment)', 'Amazon (Kuiper Q-band filings)', 'Telesat', 'Research labs'],
    color: '#a855f7',
    freqStartGHz: 33.0,
    freqEndGHz: 50.0,
  },
  {
    name: 'V-band',
    range: '40 - 75 GHz',
    primaryUse: 'Next-Gen Mega-Constellations',
    allocation: 'Primary: Fixed Satellite Service, Inter-Satellite Service',
    services: ['SpaceX Starlink V2 gateway links', 'Dense LEO constellation feeder links', 'Point-to-point high-capacity links', 'Short-range inter-satellite links'],
    advantages: ['Enormous bandwidth (up to 10 GHz blocks)', 'Enables Tbps-class constellation capacity', 'Compact antenna apertures at high gain', 'Critical for scaling mega-constellations'],
    disadvantages: ['Oxygen absorption peak at 60 GHz', 'Extreme rain attenuation', 'Requires site diversity for ground stations', 'Very limited operational heritage'],
    regulatoryBody: 'ITU-R / FCC',
    keyUsers: ['SpaceX (Starlink Gen2)', 'Amazon (Project Kuiper)', 'Boeing (V-band constellation)', 'Facebook / Meta (abandoned)'],
    color: '#d946ef',
    freqStartGHz: 40.0,
    freqEndGHz: 75.0,
  },
  {
    name: 'W-band',
    range: '75 - 110 GHz',
    primaryUse: 'Future High-Capacity Links',
    allocation: 'Under study: Fixed Satellite Service, Space Research',
    services: ['Ultra-high-capacity satellite links', 'Millimeter-wave imaging', 'Atmospheric science', 'Next-generation space communications'],
    advantages: ['Virtually unlimited bandwidth potential', 'Very narrow beamwidths for security', 'High spatial resolution for imaging', 'Frontier spectrum for innovation'],
    disadvantages: ['Extreme atmospheric absorption', 'No commercial satellite hardware yet', 'Very short viable link distances', 'Component technology still maturing'],
    regulatoryBody: 'ITU-R (WRC agenda)',
    keyUsers: ['DARPA (research programs)', 'University research labs', 'National labs', 'Future constellation planners'],
    color: '#ec4899',
    freqStartGHz: 75.0,
    freqEndGHz: 110.0,
  },
  {
    name: 'E-band',
    range: '60 - 90 GHz',
    primaryUse: 'High-Capacity Backhaul & ISLs',
    allocation: 'Light-licensed / Unlicensed (varies by region)',
    services: ['Terrestrial 5G backhaul', 'Inter-satellite links (short range)', 'Point-to-point campus links', 'Drone-to-ground communications'],
    advantages: ['Light licensing reduces regulatory burden', 'Multi-Gbps throughput achievable', 'Narrow beams reduce interference', 'Growing commercial hardware ecosystem'],
    disadvantages: ['Oxygen absorption window at 60 GHz', 'Rain attenuation limits range to ~2 km', 'Line-of-sight only', 'Limited to short-range applications'],
    regulatoryBody: 'FCC / ETSI / ITU-R',
    keyUsers: ['5G network operators', 'Facebook Terragraph (retired)', 'Satellite ground station backhaul', 'Enterprise campus networks'],
    color: '#f43f5e',
    freqStartGHz: 60.0,
    freqEndGHz: 90.0,
  },
  {
    name: 'Optical / Laser',
    range: '100 - 800 THz (Near-IR to Visible)',
    primaryUse: 'Free-Space Optical Communications',
    allocation: 'Unregulated (no ITU spectrum allocation required)',
    services: ['Starlink inter-satellite laser links', 'NASA LCRD relay demonstration', 'ESA EDRS optical relay', 'Deep space optical comms (DSOC)'],
    advantages: ['Virtually unlimited bandwidth (Tbps possible)', 'No spectrum licensing required', 'Extremely narrow beams prevent interception', 'Very low size/weight/power (SWaP)'],
    disadvantages: ['Blocked by clouds & fog', 'Requires precise pointing (sub-microradian)', 'Atmospheric turbulence degrades links', 'No broadcast capability (point-to-point only)'],
    regulatoryBody: 'None (unregulated)',
    keyUsers: ['SpaceX (Starlink laser ISLs)', 'NASA (LCRD, DSOC)', 'ESA (EDRS)', 'Mynaric / CACI'],
    color: '#fbbf24',
    freqStartGHz: 100000,
    freqEndGHz: 800000,
  },
  {
    name: 'P-band',
    range: '230 - 1000 MHz',
    primaryUse: 'Radar & Biomass Sensing',
    allocation: 'Primary: Earth Exploration Satellite Service (active)',
    services: ['ESA BIOMASS mission (SAR)', 'Subsurface radar penetration', 'Foliage penetration radar (FOPEN)', 'Ionospheric research'],
    advantages: ['Penetrates vegetation canopy', 'Can image subsurface features', 'Unique science capabilities', 'Long wavelengths reduce speckle'],
    disadvantages: ['Very large antennas required', 'Heavy interference from terrestrial services', 'Extremely limited allocations', 'Low resolution compared to higher bands'],
    regulatoryBody: 'ITU-R / ESA',
    keyUsers: ['ESA (BIOMASS)', 'JAXA', 'Defense radar systems', 'Ionospheric researchers'],
    color: '#b91c1c',
    freqStartGHz: 0.23,
    freqEndGHz: 1.0,
  },
  {
    name: 'EHF (Extremely High)',
    range: '30 - 300 GHz',
    primaryUse: 'Secure Military & Advanced Comms',
    allocation: 'Various: Military, Fixed Satellite, Space Research',
    services: ['AEHF secure military comms', 'Nuclear command & control (MILSTAR legacy)', 'Anti-jam protected communications', 'Wideband tactical data links'],
    advantages: ['Extremely difficult to jam or intercept', 'Large bandwidth for protected comms', 'Narrow beams enhance security', 'Enables low probability of detection'],
    disadvantages: ['High atmospheric attenuation', 'Expensive specialized terminals', 'Limited to military/government access', 'Complex frequency management'],
    regulatoryBody: 'NTIA / DoD / ITU-R',
    keyUsers: ['US Space Force (AEHF)', 'US Strategic Command', 'UK MoD (Skynet)', 'NATO SATCOM'],
    color: '#7c3aed',
    freqStartGHz: 30.0,
    freqEndGHz: 300.0,
  },
];

// Bands to display in the visual spectrum chart (RF bands only, in order)
const SPECTRUM_CHART_BANDS = FREQUENCY_BANDS
  .filter(b => b.freqEndGHz <= 300)
  .sort((a, b) => a.freqStartGHz - b.freqStartGHz);

const PRIMARY_USES = Array.from(new Set(FREQUENCY_BANDS.map(b => b.primaryUse))).sort();
const REGULATORY_BODIES = Array.from(
  new Set(FREQUENCY_BANDS.flatMap(b => b.regulatoryBody.split(/\s*\/\s*/)))
).sort();

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default function FrequencyBandsPage() {
  const [selectedBand, setSelectedBand] = useState<string | null>(null);
  const [filterUse, setFilterUse] = useState<string>('all');
  const [filterRegulator, setFilterRegulator] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBands = useMemo(() => {
    return FREQUENCY_BANDS.filter(band => {
      if (filterUse !== 'all' && band.primaryUse !== filterUse) return false;
      if (filterRegulator !== 'all' && !band.regulatoryBody.includes(filterRegulator)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          band.name.toLowerCase().includes(q) ||
          band.primaryUse.toLowerCase().includes(q) ||
          band.services.some(s => s.toLowerCase().includes(q)) ||
          band.keyUsers.some(u => u.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [filterUse, filterRegulator, searchQuery]);

  const activeBand = FREQUENCY_BANDS.find(b => b.name === selectedBand) || null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Space Frequency Allocations"
          subtitle="Visual reference for RF frequency bands used in space communications, satellite operations, and spectrum management."
          icon={<span role="img" aria-label="Satellite antenna">&#x1F4E1;</span>}
          accentColor="purple"
          breadcrumb="Reference"
        />

        {/* ── Visual Spectrum Chart ── */}
        <ScrollReveal>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">
              RF Spectrum Overview
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Click any band segment to view details. Widths are shown on a logarithmic scale.
            </p>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-6 overflow-x-auto">
              {/* Frequency axis labels */}
              <div className="flex items-end gap-0 min-w-[800px] mb-1">
                {SPECTRUM_CHART_BANDS.map((band) => {
                  const logStart = Math.log10(band.freqStartGHz);
                  const logEnd = Math.log10(band.freqEndGHz);
                  const logRange = Math.log10(300) - Math.log10(0.23);
                  const widthPct = ((logEnd - logStart) / logRange) * 100;
                  return (
                    <div
                      key={band.name + '-label'}
                      className="text-center flex-shrink-0"
                      style={{ width: `${widthPct}%`, minWidth: '30px' }}
                    >
                      <span className="text-xs text-slate-500 leading-none block truncate">
                        {band.freqStartGHz >= 1
                          ? `${band.freqStartGHz} GHz`
                          : `${(band.freqStartGHz * 1000).toFixed(0)} MHz`}
                      </span>
                    

        <RelatedModules modules={PAGE_RELATIONS['frequency-bands']} />
      </div>
                  );
                })}
              </div>

              {/* Band bars */}
              <div className="flex items-stretch gap-0 min-w-[800px] h-16 rounded-lg overflow-hidden">
                {SPECTRUM_CHART_BANDS.map((band) => {
                  const logStart = Math.log10(band.freqStartGHz);
                  const logEnd = Math.log10(band.freqEndGHz);
                  const logRange = Math.log10(300) - Math.log10(0.23);
                  const widthPct = ((logEnd - logStart) / logRange) * 100;
                  const isActive = selectedBand === band.name;

                  return (
                    <button
                      key={band.name}
                      onClick={() => setSelectedBand(isActive ? null : band.name)}
                      className={`relative flex-shrink-0 flex items-center justify-center transition-all duration-200 cursor-pointer border-r border-slate-950/50 group ${
                        isActive
                          ? 'ring-2 ring-white/60 z-10 scale-y-110'
                          : 'hover:brightness-125'
                      }`}
                      style={{
                        width: `${widthPct}%`,
                        minWidth: '30px',
                        backgroundColor: band.color,
                        opacity: isActive ? 1 : 0.75,
                      }}
                      title={`${band.name}: ${band.range}`}
                    >
                      <span className="text-xs font-bold text-white drop-shadow-md truncate px-1">
                        {band.name}
                      </span>
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {band.range}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* End label */}
              <div className="flex justify-end min-w-[800px] mt-1">
                <span className="text-xs text-slate-500">300 GHz</span>
              </div>

              {/* Optical note */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-3 min-w-[800px]">
                <button
                  onClick={() =>
                    setSelectedBand(selectedBand === 'Optical / Laser' ? null : 'Optical / Laser')
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedBand === 'Optical / Laser'
                      ? 'bg-amber-500/30 ring-2 ring-amber-400 text-amber-200'
                      : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                  }`}
                >
                  Optical / Laser (100 - 800 THz)
                </button>
                <span className="text-xs text-slate-500">
                  Free-space optical comms operate far beyond the RF spectrum
                </span>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Band Detail Panel ── */}
        {activeBand && (
          <ScrollReveal>
            <section className="mb-10">
              <div
                className="rounded-xl border p-6 transition-colors"
                style={{
                  borderColor: activeBand.color + '60',
                  backgroundColor: activeBand.color + '08',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-100">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2 align-middle"
                        style={{ backgroundColor: activeBand.color }}
                      />
                      {activeBand.name}
                    </h3>
                    <p className="text-slate-400 mt-1">{activeBand.range}</p>
                  </div>
                  <button
                    onClick={() => setSelectedBand(null)}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors self-start"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left column */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-1">Primary Use</h4>
                      <p className="text-slate-200">{activeBand.primaryUse}</p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-1">ITU Allocation</h4>
                      <p className="text-sm text-slate-300">{activeBand.allocation}</p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-1">Regulatory Body</h4>
                      <p className="text-sm text-slate-300">{activeBand.regulatoryBody}</p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Services</h4>
                      <ul className="space-y-1">
                        {activeBand.services.map((s) => (
                          <li key={s} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: activeBand.color }} />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-emerald-400 mb-2">Advantages</h4>
                      <ul className="space-y-1">
                        {activeBand.advantages.map((a) => (
                          <li key={a} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="text-emerald-400 mt-0.5 flex-shrink-0">+</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-red-400 mb-2">Disadvantages</h4>
                      <ul className="space-y-1">
                        {activeBand.disadvantages.map((d) => (
                          <li key={d} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="text-red-400 mt-0.5 flex-shrink-0">-</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Key Users</h4>
                      <div className="flex flex-wrap gap-2">
                        {activeBand.keyUsers.map((u) => (
                          <span
                            key={u}
                            className="text-xs px-2 py-1 rounded-full border border-slate-700 bg-slate-800/60 text-slate-300"
                          >
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* ── Filters & Search ── */}
        <ScrollReveal delay={0.1}>
          <section className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Search */}
              <div className="relative flex-1 w-full sm:max-w-xs">
                <input
                  type="text"
                  placeholder="Search bands, services, users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 pl-9 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Primary Use filter */}
              <select
                value={filterUse}
                onChange={(e) => setFilterUse(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="all">All Uses</option>
                {PRIMARY_USES.map((use) => (
                  <option key={use} value={use}>{use}</option>
                ))}
              </select>

              {/* Regulatory Body filter */}
              <select
                value={filterRegulator}
                onChange={(e) => setFilterRegulator(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="all">All Regulators</option>
                {REGULATORY_BODIES.map((body) => (
                  <option key={body} value={body}>{body}</option>
                ))}
              </select>

              {/* Result count */}
              <span className="text-sm text-slate-500 whitespace-nowrap">
                {filteredBands.length} of {FREQUENCY_BANDS.length} bands
              </span>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Band Comparison Grid ── */}
        <ScrollReveal delay={0.15}>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">
              Band Directory
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredBands.map((band) => (
                <button
                  key={band.name}
                  onClick={() => setSelectedBand(selectedBand === band.name ? null : band.name)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedBand === band.name
                      ? 'ring-2 ring-purple-400 border-purple-500/40 bg-slate-900/80'
                      : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: band.color }}
                    />
                    <h3 className="font-semibold text-slate-100">{band.name}</h3>
                    <span className="text-xs text-slate-500 ml-auto">{band.range}</span>
                  </div>
                  <p className="text-sm text-purple-300 mb-2">{band.primaryUse}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {band.services.slice(0, 2).map((s) => (
                      <span
                        key={s}
                        className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400"
                      >
                        {s}
                      </span>
                    ))}
                    {band.services.length > 2 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-500">
                        +{band.services.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {filteredBands.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg mb-1">No bands match your filters.</p>
                <p className="text-sm">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </section>
        </ScrollReveal>

        {/* ── Band Comparison Highlights ── */}
        <ScrollReveal delay={0.2}>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">
              Band Comparison Highlights
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ComparisonCard
                title="Highest Bandwidth"
                bandName="Optical / Laser"
                detail="Tbps-class links possible with no spectrum licensing"
                icon="&#x1F4A1;"
                accent="#fbbf24"
              />
              <ComparisonCard
                title="Best Rain Resilience"
                bandName="UHF / L-band"
                detail="Sub-3 GHz bands offer <0.5 dB attenuation in heavy rain"
                icon="&#x1F327;&#xFE0F;"
                accent="#22c55e"
              />
              <ComparisonCard
                title="Fastest Growing"
                bandName="Ka-band / V-band"
                detail="Mega-constellations driving explosive demand for HTS capacity"
                icon="&#x1F4C8;"
                accent="#8b5cf6"
              />
              <ComparisonCard
                title="Most Secure"
                bandName="EHF (30-300 GHz)"
                detail="Narrow beams and anti-jam properties for military SATCOM"
                icon="&#x1F512;"
                accent="#ef4444"
              />
            </div>

            {/* Quick comparison table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-3 text-slate-400 font-medium">Band</th>
                    <th className="text-left py-3 px-3 text-slate-400 font-medium">Frequency</th>
                    <th className="text-left py-3 px-3 text-slate-400 font-medium">Typical Use</th>
                    <th className="text-center py-3 px-3 text-slate-400 font-medium">Rain Fade</th>
                    <th className="text-center py-3 px-3 text-slate-400 font-medium">Bandwidth</th>
                    <th className="text-center py-3 px-3 text-slate-400 font-medium">Maturity</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'UHF', freq: '0.3-3 GHz', use: 'Telemetry', rain: 'Low', bw: 'Low', maturity: 'High' },
                    { name: 'L-band', freq: '1-2 GHz', use: 'GNSS', rain: 'Low', bw: 'Low', maturity: 'High' },
                    { name: 'S-band', freq: '2-4 GHz', use: 'TT&C', rain: 'Low', bw: 'Med', maturity: 'High' },
                    { name: 'C-band', freq: '4-8 GHz', use: 'FSS', rain: 'Low', bw: 'Med', maturity: 'High' },
                    { name: 'X-band', freq: '8-12 GHz', use: 'Military', rain: 'Med', bw: 'Med', maturity: 'High' },
                    { name: 'Ku-band', freq: '12-18 GHz', use: 'DTH/VSAT', rain: 'Med', bw: 'Med', maturity: 'High' },
                    { name: 'Ka-band', freq: '26.5-40 GHz', use: 'HTS', rain: 'High', bw: 'High', maturity: 'Med' },
                    { name: 'V-band', freq: '40-75 GHz', use: 'LEO Mega', rain: 'Very High', bw: 'Very High', maturity: 'Low' },
                    { name: 'Optical', freq: '100-800 THz', use: 'ISL/Relay', rain: 'N/A (clouds)', bw: 'Extreme', maturity: 'Med' },
                  ].map((row) => (
                    <tr key={row.name} className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-200">{row.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{row.freq}</td>
                      <td className="py-2.5 px-3 text-slate-400">{row.use}</td>
                      <td className="py-2.5 px-3 text-center">
                        <RatingPill value={row.rain} />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <RatingPill value={row.bw} />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <RatingPill value={row.maturity} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Key Regulatory Notes ── */}
        <ScrollReveal delay={0.25}>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">
              Regulatory Context
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold text-slate-200 mb-2">ITU World Radiocommunication Conference (WRC)</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The ITU-R allocates spectrum globally through the Radio Regulations, updated at WRC every 3-4 years.
                  WRC-23 addressed Ka/V-band non-GSO constellation sharing rules, EESS allocations, and IMT identification
                  in bands above 100 GHz. WRC-27 will examine further Q/V/W-band satellite allocations and optical
                  communication frameworks.
                </p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold text-slate-200 mb-2">C-band 5G Transition</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The FCC&apos;s C-band Order reallocated 3.7-3.98 GHz from satellite to 5G terrestrial use, generating
                  $81B in auction revenue. Satellite operators were relocated to 4.0-4.2 GHz with compressed transponder
                  plans. This precedent raises concerns about future reallocation pressure on other satellite bands as
                  terrestrial 5G/6G demand grows.
                </p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold text-slate-200 mb-2">EPFD Limits for NGSO</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Non-geostationary (NGSO) mega-constellations must comply with Equivalent Power Flux Density (EPFD) limits
                  to protect GSO satellite networks. ITU Article 22 defines these limits per band. Starlink, Kuiper, and OneWeb
                  must demonstrate compliance through complex orbital simulations before operations commence.
                </p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold text-slate-200 mb-2">Optical Comms: Unregulated Frontier</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Free-space optical links currently require no spectrum license since they operate above 3 THz and fall outside
                  ITU Radio Regulations. However, as optical inter-satellite links proliferate (Starlink has 9,000+ laser
                  terminals), the community is debating whether safety standards and coordination frameworks are needed
                  for ground-to-space optical uplinks to prevent aircraft hazards.
                </p>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Related Links ── */}
        <ScrollReveal delay={0.3}>
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">
              Related Tools & References
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <RelatedLink
                href="/spectrum"
                title="Spectrum Management"
                description="Track allocations, auctions, and interference events"
                icon="&#x1F4E1;"
              />
              <RelatedLink
                href="/link-budget-calculator"
                title="Link Budget Calculator"
                description="Calculate signal margins for any frequency band"
                icon="&#x1F4CA;"
              />
              <RelatedLink
                href="/satellites"
                title="Satellite Tracker"
                description="Track active satellites and their communication bands"
                icon="&#x1F6F0;&#xFE0F;"
              />
              <RelatedLink
                href="/tech-readiness"
                title="Technology Readiness"
                description="Assess TRL for emerging frequency technologies"
                icon="&#x1F52C;"
              />
            </div>
          </section>
        </ScrollReveal>

        {/* Footer note */}
        <div className="text-center text-xs text-slate-600 pb-8">
          <p>
            Data compiled from ITU Radio Regulations, FCC spectrum allocations, and public filings.
            For official allocations consult the{' '}
            <a
              href="https://www.itu.int/pub/R-REG-RR"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline"
            >
              ITU Radio Regulations
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}

// ────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────

function ComparisonCard({
  title,
  bandName,
  detail,
  icon,
  accent,
}: {
  title: string;
  bandName: string;
  detail: string;
  icon: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:bg-slate-900/70 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl" dangerouslySetInnerHTML={{ __html: icon }} />
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      </div>
      <p className="text-lg font-bold mb-1" style={{ color: accent }}>
        {bandName}
      </p>
      <p className="text-xs text-slate-400 leading-relaxed">{detail}</p>
    </div>
  );
}

function RatingPill({ value }: { value: string }) {
  const colors: Record<string, string> = {
    'Low': 'bg-emerald-500/20 text-emerald-300',
    'Med': 'bg-yellow-500/20 text-yellow-300',
    'Medium': 'bg-yellow-500/20 text-yellow-300',
    'High': 'bg-orange-500/20 text-orange-300',
    'Very High': 'bg-red-500/20 text-red-300',
    'Extreme': 'bg-purple-500/20 text-purple-300',
    'N/A (clouds)': 'bg-slate-500/20 text-slate-400',
  };

  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${colors[value] || 'bg-slate-700 text-slate-400'}`}>
      {value}
    </span>
  );
}

function RelatedLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:bg-slate-900/70 hover:border-purple-500/30 transition-all"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg" dangerouslySetInnerHTML={{ __html: icon }} />
        <h3 className="text-sm font-semibold text-slate-200 group-hover:text-purple-300 transition-colors">
          {title}
        </h3>
        <svg
          className="w-4 h-4 text-slate-600 group-hover:text-purple-400 ml-auto transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </Link>
  );
}
