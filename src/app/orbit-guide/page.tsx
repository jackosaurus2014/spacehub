'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrbitType {
  name: string;
  abbreviation: string;
  altitudeRange: string;
  period: string;
  velocity: string;
  deltaV: string;
  uses: string[];
  examples: string[];
  characteristics: string;
  advantages: string[];
  disadvantages: string[];
  color: string;
  barHeight: number; // percentage height for the visual comparison chart
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const ORBIT_TYPES: OrbitType[] = [
  {
    name: 'Low Earth Orbit',
    abbreviation: 'LEO',
    altitudeRange: '160 - 2,000 km',
    period: '~90 minutes',
    velocity: '~7.8 km/s',
    deltaV: '~9.4 km/s from surface',
    uses: [
      'Earth observation & remote sensing',
      'Broadband mega-constellations',
      'Crewed space stations',
      'Technology demonstration',
      'Space tourism',
    ],
    examples: ['ISS (408 km)', 'Starlink (~550 km)', 'Hubble Space Telescope (547 km)', 'Planet Labs Dove (~475 km)'],
    characteristics:
      'The most accessible and heavily used orbital regime. Low latency makes it ideal for communications constellations. Atmospheric drag requires periodic re-boost and limits orbital lifetime without station-keeping.',
    advantages: [
      'Lowest launch cost and delta-v requirement',
      'Low latency for communications (~4 ms)',
      'High-resolution Earth imaging',
      'Easier crew access and resupply',
    ],
    disadvantages: [
      'Limited ground coverage per pass',
      'Atmospheric drag causes orbital decay',
      'Growing debris and congestion risk',
      'Requires large constellations for global coverage',
    ],
    color: 'bg-cyan-500',
    barHeight: 5,
  },
  {
    name: 'Medium Earth Orbit',
    abbreviation: 'MEO',
    altitudeRange: '2,000 - 35,786 km',
    period: '2 - 24 hours',
    velocity: '~3.9 km/s',
    deltaV: '~12.3 km/s from surface',
    uses: [
      'Navigation satellite systems (GNSS)',
      'Medium-latency broadband',
      'Search and rescue beacons',
      'Scientific research',
    ],
    examples: ['GPS (~20,200 km)', 'Galileo (~23,222 km)', 'O3b mPOWER (~8,062 km)', 'GLONASS (~19,130 km)'],
    characteristics:
      'A middle ground between LEO and GEO offering a balance of coverage area and signal latency. Navigation constellations operate here because the altitude provides wide visibility while maintaining acceptable signal strength.',
    advantages: [
      'Wider coverage footprint than LEO',
      'Lower latency than GEO (~80 ms)',
      'Less atmospheric drag than LEO',
      'Fewer satellites needed for global coverage',
    ],
    disadvantages: [
      'Passes through Van Allen radiation belts',
      'Higher launch energy than LEO',
      'Longer signal propagation delay than LEO',
      'More expensive radiation-hardened components needed',
    ],
    color: 'bg-blue-500',
    barHeight: 14,
  },
  {
    name: 'Geostationary Orbit',
    abbreviation: 'GEO',
    altitudeRange: '35,786 km (exact)',
    period: '23 h 56 min (sidereal day)',
    velocity: '~3.07 km/s',
    deltaV: '~14.0 km/s from surface',
    uses: [
      'Weather monitoring & meteorology',
      'Broadcast television & telecommunications',
      'Missile early warning systems',
      'Data relay satellites',
    ],
    examples: ['GOES-16/17 (weather)', 'SES Astra (TV broadcast)', 'SBIRS (early warning)', 'TDRS (data relay)'],
    characteristics:
      'Satellites appear stationary relative to the ground, enabling fixed ground antennas. The equatorial geostationary belt is a finite resource managed by the ITU. Only one altitude satisfies the 24-hour period requirement at zero inclination.',
    advantages: [
      'Constant coverage of one-third of Earth',
      'Fixed ground antenna pointing (no tracking)',
      'Mature technology and infrastructure',
      'Ideal for continuous weather monitoring',
    ],
    disadvantages: [
      'High latency (~240 ms round-trip)',
      'No coverage above ~81 degrees latitude',
      'Expensive to reach (high delta-v)',
      'Limited orbital slots along the equator',
    ],
    color: 'bg-indigo-500',
    barHeight: 28,
  },
  {
    name: 'Highly Elliptical Orbit / Molniya',
    abbreviation: 'HEO',
    altitudeRange: '500 - 39,900 km (varies)',
    period: '~12 hours (Molniya)',
    velocity: 'Variable (0.9 - 10 km/s)',
    deltaV: '~14.5 km/s from surface',
    uses: [
      'High-latitude communications',
      'Satellite radio broadcasting',
      'Intelligence and reconnaissance',
      'Arctic monitoring',
    ],
    examples: ['Molniya (Russian comms)', 'Sirius XM (satellite radio)', 'Tundra orbit (military comms)', 'Meridian (Russian military)'],
    characteristics:
      'Highly eccentric orbits spend most of their period near apogee, loitering over high-latitude regions that GEO cannot serve. The Molniya orbit has a 63.4-degree critical inclination that freezes the argument of perigee, preventing apsidal rotation.',
    advantages: [
      'Excellent coverage of polar and high-latitude regions',
      'Long dwell time at apogee over target area',
      'Less expensive than GEO for regional coverage',
      'Avoids GEO slot allocation politics',
    ],
    disadvantages: [
      'Complex ground tracking (moving satellite)',
      'Passes through Van Allen belts twice per orbit',
      'Requires at least 2-3 satellites for continuous coverage',
      'Higher radiation exposure at apogee',
    ],
    color: 'bg-violet-500',
    barHeight: 32,
  },
  {
    name: 'Sun-Synchronous Orbit',
    abbreviation: 'SSO',
    altitudeRange: '600 - 800 km (typical)',
    period: '~96 - 100 minutes',
    velocity: '~7.5 km/s',
    deltaV: '~9.5 km/s from surface',
    uses: [
      'Earth observation with consistent lighting',
      'Environmental monitoring',
      'Agricultural and forestry mapping',
      'Disaster response imaging',
    ],
    examples: ['Landsat 8/9 (~705 km)', 'Sentinel-2 (~786 km)', 'WorldView Legion (~500 km)', 'SPOT satellites (~694 km)'],
    characteristics:
      'A near-polar retrograde orbit where the orbital plane precesses at exactly one degree per day to match Earth\'s revolution around the Sun. This ensures the satellite crosses any given latitude at the same local solar time, providing consistent illumination for imagery.',
    advantages: [
      'Consistent solar illumination angle on every pass',
      'Enables long-term change detection in imagery',
      'Full global coverage over days to weeks',
      'Ideal for multi-spectral and SAR imaging',
    ],
    disadvantages: [
      'Fixed overpass time limits observation flexibility',
      'Higher inclination requires more launch energy',
      'Polar launch corridors have geographic constraints',
      'Atmospheric drag still relevant at these altitudes',
    ],
    color: 'bg-amber-500',
    barHeight: 6,
  },
  {
    name: 'Polar Orbit',
    abbreviation: 'PO',
    altitudeRange: '200 - 1,000 km',
    period: '~87 - 105 minutes',
    velocity: '~7.5 km/s',
    deltaV: '~9.5 km/s from surface',
    uses: [
      'Full-globe Earth observation',
      'Reconnaissance and surveillance',
      'Weather observation (low orbit)',
      'Scientific measurements of polar regions',
    ],
    examples: ['NOAA POES series', 'Suomi NPP', 'DMSP (military weather)', 'ICESat-2 (ice monitoring)'],
    characteristics:
      'Orbits with inclinations near 90 degrees that pass over both poles on every revolution. Earth\'s rotation beneath the satellite means every point on the globe is eventually overflown. Not all polar orbits are sun-synchronous.',
    advantages: [
      'Complete global surface coverage',
      'Excellent for mapping and geodesy',
      'Access to polar regions inaccessible from GEO',
      'Low altitude enables high-resolution data',
    ],
    disadvantages: [
      'Short contact windows with any single ground station',
      'Requires polar launch corridors (limited launch sites)',
      'No persistent coverage of any single location',
      'Higher delta-v penalty for equatorial launch sites',
    ],
    color: 'bg-teal-500',
    barHeight: 5,
  },
  {
    name: 'Geostationary Transfer Orbit',
    abbreviation: 'GTO',
    altitudeRange: '185 km perigee - 35,786 km apogee',
    period: '~10.5 hours',
    velocity: '~1.6 km/s at apogee, ~10.2 km/s at perigee',
    deltaV: '~12.2 km/s from surface (to GTO), +1.8 km/s to circularize',
    uses: [
      'Transfer to geostationary orbit',
      'Dual-manifest rideshare (drop-off in GTO)',
      'Highly elliptical mission staging',
    ],
    examples: ['Ariane 5 GTO missions', 'Falcon 9 GTO launches', 'Atlas V GTO payloads', 'H-IIA GTO flights'],
    characteristics:
      'An elliptical transition orbit used to deliver payloads from LEO to GEO. The satellite fires its apogee kick motor or uses electric propulsion at apogee to circularize into GEO. The transfer takes hours chemically or months electrically.',
    advantages: [
      'Standard and well-understood transfer method',
      'Enables rideshare opportunities to GEO',
      'Multiple launch vehicles can deliver to GTO',
      'Electric propulsion can reduce launch mass requirements',
    ],
    disadvantages: [
      'Extended time in radiation belts during transfer',
      'Requires onboard propulsion for circularization',
      'Payload must survive wide temperature swings',
      'Chemical propulsion wastes mass on fuel',
    ],
    color: 'bg-orange-500',
    barHeight: 26,
  },
  {
    name: 'Lunar Transfer Orbit',
    abbreviation: 'LTO',
    altitudeRange: '~185 km to 384,400 km',
    period: '~4 - 6 days (transit)',
    velocity: '~10.9 km/s at TLI',
    deltaV: '~3.1 km/s from LEO (trans-lunar injection)',
    uses: [
      'Crewed lunar missions',
      'Lunar cargo delivery',
      'Commercial lunar lander missions (CLPS)',
      'Lunar orbit insertion',
    ],
    examples: ['Artemis I/II/III', 'CLPS (Astrobotic, Intuitive Machines)', 'Apollo missions (historical)', 'Chandrayaan-3'],
    characteristics:
      'A high-energy trajectory from Earth orbit to the Moon. Modern missions often use low-energy ballistic transfers via Sun-Earth Lagrange points to reduce delta-v, trading time for fuel savings. Flight time ranges from 3 days (direct) to 4+ months (low-energy).',
    advantages: [
      'Enables access to the lunar surface and orbit',
      'Low-energy options reduce propellant requirements',
      'Growing commercial infrastructure and rideshare',
      'Multiple trajectory options for mission flexibility',
    ],
    disadvantages: [
      'High delta-v requirement from Earth orbit',
      'Long transit exposes payloads to deep-space radiation',
      'Precise navigation and mid-course corrections required',
      'Limited launch window opportunities',
    ],
    color: 'bg-slate-400',
    barHeight: 62,
  },
  {
    name: 'Earth-Sun Lagrange Point (L1/L2)',
    abbreviation: 'L1/L2',
    altitudeRange: '~1.5 million km from Earth',
    period: 'Halo orbit: ~6 months',
    velocity: '~0.2 km/s (station-keeping)',
    deltaV: '~3.4 km/s from LEO',
    uses: [
      'Space-based astronomy and cosmology',
      'Solar observation and space weather',
      'Deep-space communications relay',
      'Fundamental physics experiments',
    ],
    examples: ['JWST (L2)', 'SOHO (L1)', 'DSCOVR (L1)', 'Gaia (L2)', 'Euclid (L2)'],
    characteristics:
      'The Sun-Earth L1 point sits between the two bodies and is ideal for uninterrupted solar observation. L2 lies behind Earth (from the Sun) offering a thermally stable, dark-sky environment perfect for infrared and microwave astronomy. Both require station-keeping maneuvers.',
    advantages: [
      'Thermally stable environment for sensitive instruments',
      'Continuous solar observation (L1) or dark sky (L2)',
      'Minimal orbital maintenance required',
      'Earth communication always available',
    ],
    disadvantages: [
      'Very far from Earth (1.5M km), no servicing possible',
      'Station-keeping fuel limits mission lifetime',
      'Months-long transit from Earth',
      'Unstable equilibrium requires active control',
    ],
    color: 'bg-yellow-500',
    barHeight: 78,
  },
  {
    name: 'Mars Transfer Orbit',
    abbreviation: 'MTO',
    altitudeRange: '~1 AU to ~1.52 AU (Hohmann)',
    period: '~6 - 9 months (transit)',
    velocity: '~11.6 km/s departure',
    deltaV: '~3.6 km/s from LEO (TMI) + ~2.1 km/s MOI',
    uses: [
      'Mars exploration rovers and landers',
      'Mars orbital science missions',
      'Future crewed Mars missions',
      'Interplanetary communication relays',
    ],
    examples: ['Mars 2020 / Perseverance', 'Mars Reconnaissance Orbiter', 'SpaceX Starship (planned)', 'Mars Express'],
    characteristics:
      'A heliocentric Hohmann-like transfer ellipse that departs Earth near perihelion and arrives at Mars near aphelion. Launch windows occur roughly every 26 months during planetary opposition. Advanced trajectories use gravity assists or continuous thrust to shorten transit.',
    advantages: [
      'Well-studied trajectory mechanics',
      'Regular launch windows every ~26 months',
      'Gravity assists from Venus possible',
      'Growing heritage of successful missions',
    ],
    disadvantages: [
      'Very high total delta-v requirement',
      'Long transit with months of deep-space radiation',
      'Narrow launch windows with severe mass penalties if missed',
      'Communication delays of 4 - 24 minutes one-way',
    ],
    color: 'bg-red-500',
    barHeight: 92,
  },
  {
    name: 'Graveyard Orbit',
    abbreviation: 'GYO',
    altitudeRange: '~36,100 km (300 km above GEO)',
    period: '~24.5 hours',
    velocity: '~3.05 km/s',
    deltaV: '~11 m/s from GEO',
    uses: [
      'Disposal of end-of-life GEO satellites',
      'Reducing collision risk in GEO belt',
      'Regulatory compliance with debris guidelines',
    ],
    examples: ['Retired GOES satellites', 'Decommissioned Intelsat spacecraft', 'End-of-life Anik satellites', 'IADC-compliant disposals'],
    characteristics:
      'A disposal orbit several hundred kilometers above the geostationary belt where defunct satellites are boosted at end of life. This preserves the valuable GEO belt for operational spacecraft. IADC guidelines recommend at least 235 km above GEO plus a margin based on spacecraft area-to-mass ratio.',
    advantages: [
      'Protects the valuable GEO belt from debris',
      'Low delta-v cost to reach from GEO (~11 m/s)',
      'Well-established international guidelines',
      'Minimal risk of re-entry to Earth',
    ],
    disadvantages: [
      'Debris accumulates permanently (no natural decay)',
      'Requires fuel reservation at end of mission',
      'Not all operators comply with guidelines',
      'No active debris removal capability yet',
    ],
    color: 'bg-gray-500',
    barHeight: 30,
  },
  {
    name: 'Cislunar / Near-Rectilinear Halo Orbit',
    abbreviation: 'NRHO',
    altitudeRange: '~3,000 - 70,000 km from Moon',
    period: '~6.5 days',
    velocity: '~0.1 - 1.4 km/s',
    deltaV: '~0.8 km/s from low lunar orbit',
    uses: [
      'Lunar Gateway station',
      'Lunar surface access staging',
      'Cislunar space domain awareness',
      'Deep-space crew habitation',
    ],
    examples: ['Lunar Gateway (planned)', 'CAPSTONE (pathfinder)', 'Artemis III staging', 'ESPRIT refueling module'],
    characteristics:
      'A highly elongated orbit around the Moon stabilized by the three-body dynamics of the Earth-Moon system. The NRHO selected for the Lunar Gateway passes close to the lunar south pole and far over the north, offering near-continuous Earth visibility and low station-keeping costs of roughly 10 m/s per year.',
    advantages: [
      'Near-continuous line of sight to Earth',
      'Low station-keeping delta-v (~10 m/s/year)',
      'Access to lunar south pole and far side',
      'Stable in three-body dynamics (low maintenance)',
    ],
    disadvantages: [
      'Far from the lunar surface at apoapsis',
      'Requires precise navigation in three-body regime',
      'Long transit times to and from Earth',
      'Limited heritage and operational experience',
    ],
    color: 'bg-purple-500',
    barHeight: 55,
  },
];

/* ------------------------------------------------------------------ */
/*  Altitude Bar Chart                                                 */
/* ------------------------------------------------------------------ */

function AltitudeChart() {
  const displayOrbits = ORBIT_TYPES.filter(
    (o) => !['MTO'].includes(o.abbreviation)
  );

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 md:p-8">
      <h2 className="text-xl font-bold text-slate-100 mb-2">Relative Altitude Comparison</h2>
      <p className="text-sm text-slate-400 mb-6">
        Visual scale showing orbit altitudes relative to each other (Mars Transfer excluded for scale)
      </p>
      <div className="flex items-end gap-2 md:gap-3 h-72 md:h-80">
        {displayOrbits.map((orbit) => (
          <div key={orbit.abbreviation} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <span className="text-[10px] md:text-xs text-slate-400 text-center leading-tight">
              {orbit.altitudeRange.split(' ')[0]}
            </span>
            <div
              className={`w-full rounded-t-md ${orbit.color} transition-all duration-500 relative group cursor-pointer`}
              style={{ height: `${orbit.barHeight}%`, minHeight: '16px' }}
            >
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {orbit.name}
                <br />
                {orbit.altitudeRange}
              </div>
            </div>
            <span className="text-[10px] md:text-xs font-mono font-bold text-slate-300 text-center">
              {orbit.abbreviation}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
        </svg>
        Hover over bars for details. Heights are illustrative, not to linear scale.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Orbit Card                                                         */
/* ------------------------------------------------------------------ */

function OrbitCard({ orbit, index }: { orbit: OrbitType; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <ScrollReveal delay={index * 0.04}>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition-colors">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-5 md:p-6 flex items-start gap-4 group"
          aria-expanded={expanded}
        >
          {/* Color badge */}
          <div className={`w-3 h-3 mt-1.5 rounded-full ${orbit.color} flex-shrink-0 ring-2 ring-offset-2 ring-offset-slate-800 ${orbit.color.replace('bg-', 'ring-')}`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-100">{orbit.name}</h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                {orbit.abbreviation}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">{orbit.altitudeRange}</p>

            {/* Quick metrics */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-400">
              <span>
                <strong className="text-slate-300">Period:</strong> {orbit.period}
              </span>
              <span>
                <strong className="text-slate-300">Velocity:</strong> {orbit.velocity}
              </span>
              <span>
                <strong className="text-slate-300">Delta-v:</strong> {orbit.deltaV}
              </span>
            </div>
          </div>

          {/* Expand chevron */}
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 mt-1 ${
              expanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expandable Detail */}
        {expanded && (
          <div className="px-5 md:px-6 pb-5 md:pb-6 border-t border-slate-700/50 pt-4 space-y-5">
            {/* Characteristics */}
            <div>
              <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2">
                Characteristics
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">{orbit.characteristics}</p>
            </div>

            {/* Uses & Examples side-by-side */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2">
                  Primary Uses
                </h4>
                <ul className="space-y-1">
                  {orbit.uses.map((use) => (
                    <li key={use} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-cyan-400 mt-0.5">&#8226;</span>
                      {use}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2">
                  Notable Examples
                </h4>
                <ul className="space-y-1">
                  {orbit.examples.map((ex) => (
                    <li key={ex} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-amber-400 mt-0.5">&#9679;</span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Advantages / Disadvantages */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                  Advantages
                </h4>
                <ul className="space-y-1">
                  {orbit.advantages.map((adv) => (
                    <li key={adv} className="flex items-start gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {adv}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">
                  Disadvantages
                </h4>
                <ul className="space-y-1">
                  {orbit.disadvantages.map((dis) => (
                    <li key={dis} className="flex items-start gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {dis}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick-Reference Table                                              */
/* ------------------------------------------------------------------ */

function QuickReferenceTable() {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-5 md:p-6 border-b border-slate-700">
        <h2 className="text-xl font-bold text-slate-100">Quick Reference</h2>
        <p className="text-sm text-slate-400 mt-1">At-a-glance metrics for all orbit types</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-4 py-3 text-slate-300 font-semibold">Orbit</th>
              <th className="px-4 py-3 text-slate-300 font-semibold">Altitude</th>
              <th className="px-4 py-3 text-slate-300 font-semibold">Period</th>
              <th className="px-4 py-3 text-slate-300 font-semibold">Velocity</th>
              <th className="px-4 py-3 text-slate-300 font-semibold">Delta-v</th>
            </tr>
          </thead>
          <tbody>
            {ORBIT_TYPES.map((orbit, i) => (
              <tr
                key={orbit.abbreviation}
                className={`border-b border-slate-700/50 ${i % 2 === 0 ? 'bg-slate-800/30' : ''}`}
              >
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${orbit.color}`} />
                    <span className="font-mono text-slate-200">{orbit.abbreviation}</span>
                    <span className="text-slate-400 hidden md:inline">- {orbit.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{orbit.altitudeRange}</td>
                <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{orbit.period}</td>
                <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{orbit.velocity}</td>
                <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{orbit.deltaV}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Key Concepts Section                                               */
/* ------------------------------------------------------------------ */

function KeyConcepts() {
  const concepts = [
    {
      term: 'Delta-v',
      definition:
        'The change in velocity needed to perform a maneuver. It is the fundamental "currency" of spaceflight -- every orbit change, launch, and landing has a delta-v cost.',
    },
    {
      term: 'Orbital Period',
      definition:
        'The time for one complete orbit. Governed by Kepler\'s third law: period squared is proportional to semi-major axis cubed. Higher orbits are slower.',
    },
    {
      term: 'Inclination',
      definition:
        'The angle between the orbital plane and the equatorial plane. Zero degrees is equatorial; 90 degrees is polar. Sun-synchronous orbits typically have ~97-98 degree inclination.',
    },
    {
      term: 'Eccentricity',
      definition:
        'How elongated an orbit is. Zero is a perfect circle; values approaching 1 are highly elliptical. Molniya orbits have eccentricities around 0.74.',
    },
    {
      term: 'Hohmann Transfer',
      definition:
        'The most fuel-efficient two-impulse maneuver to transfer between two circular orbits. It uses an ellipse tangent to both orbits, with burns at perigee and apogee.',
    },
    {
      term: 'Lagrange Points',
      definition:
        'Five gravitational equilibrium points in a two-body system where a small object can maintain a stable position relative to both large bodies. L1 and L2 are most useful for spacecraft.',
    },
  ];

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 md:p-6">
      <h2 className="text-xl font-bold text-slate-100 mb-4">Key Orbital Mechanics Concepts</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {concepts.map((c) => (
          <div key={c.term} className="bg-slate-900/40 rounded-lg p-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-1">
              {c.term}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">{c.definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function OrbitGuidePage() {
  const [filter, setFilter] = useState<string>('all');

  const categories: Record<string, string[]> = {
    all: [],
    'Near-Earth': ['LEO', 'MEO', 'GEO', 'SSO', 'PO', 'GTO', 'GYO'],
    'Deep Space': ['LTO', 'L1/L2', 'MTO', 'NRHO'],
    Elliptical: ['HEO', 'GTO', 'LTO', 'MTO'],
  };

  const filteredOrbits =
    filter === 'all'
      ? ORBIT_TYPES
      : ORBIT_TYPES.filter((o) => categories[filter]?.includes(o.abbreviation));

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        {/* Header */}
        <AnimatedPageHeader
          title="Orbit Types Guide"
          subtitle="A comprehensive visual guide to orbital mechanics and the major orbit types used in spaceflight -- from low Earth orbit to interplanetary transfers."
          icon={<span aria-hidden="true">&#127757;</span>}
          breadcrumb="Educational Resources"
          accentColor="blue"
        />

        {/* Altitude Chart */}
        <ScrollReveal>
          <AltitudeChart />
        </ScrollReveal>

        {/* Filter Tabs */}
        <ScrollReveal delay={0.1}>
          <div className="mt-10 mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-400 mr-1">Filter:</span>
            {Object.keys(categories).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  filter === cat
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                }`}
              >
                {cat}
                {cat !== 'all' && (
                  <span className="ml-1.5 text-xs opacity-60">({categories[cat].length})</span>
                )}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Orbit Cards */}
        <div className="space-y-4">
          {filteredOrbits.map((orbit, i) => (
            <OrbitCard key={orbit.abbreviation} orbit={orbit} index={i} />
          ))}
        </div>

        {/* Quick Reference Table */}
        <ScrollReveal className="mt-12">
          <QuickReferenceTable />
        </ScrollReveal>

        {/* Key Concepts */}
        <ScrollReveal className="mt-10">
          <KeyConcepts />
        </ScrollReveal>

        {/* Related Links */}
        <ScrollReveal className="mt-10">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 md:p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Related Resources</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: '/orbital-calculator', label: 'Orbital Calculator', desc: 'Calculate orbital parameters and transfers' },
                { href: '/satellites', label: 'Satellite Tracker', desc: 'Track satellites in real-time across all orbits' },
                { href: '/constellations', label: 'Constellations', desc: 'Explore major satellite constellations' },
                { href: '/glossary', label: 'Space Glossary', desc: 'Definitions of key space terminology' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-colors group"
                >
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {link.label}
                  </span>
                  <span className="block text-xs text-slate-400 mt-1">{link.desc}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-cyan-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Footer note */}
        <ScrollReveal className="mt-8">
          <p className="text-center text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Data sourced from NASA, ESA, and IAF publications. Altitude, velocity, and delta-v
            values are approximate and may vary depending on specific mission parameters, launch site
            latitude, and spacecraft mass. This guide is intended for educational purposes.
          </p>
        </ScrollReveal>
      </div>
    </main>
  );
}
