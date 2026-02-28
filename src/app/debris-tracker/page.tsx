'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ════════════════════════════════════════
// Types & Constants
// ════════════════════════════════════════

type ActiveTab = 'overview' | 'events' | 'removal' | 'regulations' | 'technology';

interface DebrisStat {
  label: string;
  value: string;
  detail: string;
  trend?: 'up' | 'down' | 'stable';
  color: string;
}

interface OrbitDistribution {
  orbit: string;
  tracked: string;
  percentage: number;
  altitude: string;
  color: string;
  description: string;
}

interface DebrisEvent {
  year: number;
  name: string;
  fragments: string;
  orbit: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  stillTracked: string;
}

interface RemovalCompany {
  name: string;
  country: string;
  technology: string;
  status: string;
  mission: string;
  fundingStage: string;
  website: string;
}

interface MitigationTech {
  name: string;
  category: string;
  readiness: string;
  description: string;
  pros: string[];
  cons: string[];
  trl: number;
}

interface Regulation {
  body: string;
  guideline: string;
  year: number;
  scope: string;
  keyPoints: string[];
}

// ════════════════════════════════════════
// Data
// ════════════════════════════════════════

const KEY_STATISTICS: DebrisStat[] = [
  {
    label: 'Total Tracked Objects',
    value: '36,500+',
    detail: 'Objects >10cm tracked by US Space Surveillance Network',
    trend: 'up',
    color: 'text-red-400',
  },
  {
    label: 'Estimated Debris Pieces',
    value: '130M+',
    detail: 'Objects 1mm-10cm too small to track individually',
    trend: 'up',
    color: 'text-orange-400',
  },
  {
    label: 'Debris Growth Rate',
    value: '~5%/yr',
    detail: 'Annual increase in cataloged objects since 2020',
    trend: 'up',
    color: 'text-amber-400',
  },
  {
    label: 'Collision Warnings/Week',
    value: '~1,600',
    detail: 'Conjunction data messages issued weekly by 18th SDS',
    trend: 'up',
    color: 'text-yellow-400',
  },
  {
    label: 'Avoidance Maneuvers (ISS)',
    value: '32/yr avg',
    detail: 'ISS collision avoidance maneuvers in recent years',
    trend: 'up',
    color: 'text-cyan-400',
  },
  {
    label: 'Kessler Syndrome Risk',
    value: 'Elevated',
    detail: 'Self-sustaining cascade increasingly likely in LEO bands',
    trend: 'up',
    color: 'text-rose-400',
  },
];

const ORBIT_DISTRIBUTION: OrbitDistribution[] = [
  {
    orbit: 'LEO (Low Earth Orbit)',
    tracked: '26,000+',
    percentage: 72,
    altitude: '200-2,000 km',
    color: 'bg-red-500',
    description:
      'Most congested region. Home to ISS, Starlink, OneWeb mega-constellations. Highest collision risk due to density and relative velocities of ~7.5 km/s.',
  },
  {
    orbit: 'MEO (Medium Earth Orbit)',
    tracked: '2,800+',
    percentage: 8,
    altitude: '2,000-35,786 km',
    color: 'bg-amber-500',
    description:
      'Navigation satellite region (GPS, Galileo, GLONASS, BeiDou). Less congested but debris persists for centuries due to limited atmospheric drag.',
  },
  {
    orbit: 'GEO (Geostationary Orbit)',
    tracked: '1,900+',
    percentage: 5,
    altitude: '~35,786 km',
    color: 'bg-blue-500',
    description:
      'Critical communications belt. Limited orbital slots make debris especially problematic. Graveyard orbits used for decommissioned satellites.',
  },
  {
    orbit: 'HEO & Other',
    tracked: '5,800+',
    percentage: 15,
    altitude: 'Various',
    color: 'bg-purple-500',
    description:
      'Highly elliptical orbits (Molniya), sun-synchronous, polar orbits, and transfer orbits. Includes rocket bodies and mission-related debris.',
  },
];

const MAJOR_EVENTS: DebrisEvent[] = [
  {
    year: 2007,
    name: 'Chinese ASAT Test (Fengyun-1C)',
    fragments: '3,500+',
    orbit: 'LEO (865 km)',
    description:
      'China destroyed its own Fengyun-1C weather satellite with a kinetic kill vehicle. Created the single largest debris cloud in history. Fragments spread across a wide altitude band from 200 km to 4,000 km.',
    severity: 'critical',
    stillTracked: '2,800+ pieces still in orbit',
  },
  {
    year: 2009,
    name: 'Iridium 33 / Cosmos 2251 Collision',
    fragments: '2,300+',
    orbit: 'LEO (790 km)',
    description:
      'First accidental hypervelocity collision between two intact satellites. Active Iridium communications satellite struck by defunct Russian Cosmos military satellite at ~11.7 km/s relative velocity.',
    severity: 'critical',
    stillTracked: '1,700+ pieces still in orbit',
  },
  {
    year: 2021,
    name: 'Russian ASAT Test (Cosmos 1408)',
    fragments: '1,500+',
    orbit: 'LEO (480 km)',
    description:
      'Russia destroyed its own defunct Cosmos 1408 satellite using a direct-ascent anti-satellite missile. Created debris cloud threatening ISS crew, forcing emergency shelter-in-place procedures.',
    severity: 'critical',
    stillTracked: '800+ pieces still in orbit',
  },
  {
    year: 2023,
    name: 'Starlink Conjunction Cluster',
    fragments: 'N/A',
    orbit: 'LEO (550 km)',
    description:
      'Multiple close approaches between Starlink constellation satellites and tracked debris objects. Highlighted the growing challenge of managing mega-constellation collision avoidance at scale.',
    severity: 'high',
    stillTracked: 'Ongoing monitoring',
  },
  {
    year: 2019,
    name: 'India ASAT Test (Mission Shakti)',
    fragments: '400+',
    orbit: 'LEO (283 km)',
    description:
      'India destroyed its Microsat-R satellite at relatively low altitude. Most debris decayed within months due to atmospheric drag, but some fragments were tracked at higher altitudes.',
    severity: 'high',
    stillTracked: 'Mostly decayed, <10 pieces remain',
  },
  {
    year: 2013,
    name: 'Briz-M Upper Stage Breakup',
    fragments: '100+',
    orbit: 'GTO (various)',
    description:
      'Russian Briz-M rocket upper stage exploded in geosynchronous transfer orbit due to residual propellant. One of several upper-stage breakup events highlighting the need for passivation standards.',
    severity: 'medium',
    stillTracked: '80+ pieces still in orbit',
  },
];

const REMOVAL_COMPANIES: RemovalCompany[] = [
  {
    name: 'Astroscale',
    country: 'Japan / UK',
    technology: 'Magnetic capture plate (ELSA-d), robotic arm',
    status: 'Flight demonstrated (ELSA-d 2021)',
    mission: 'ADRAS-J (2024) inspection, ELSA-M multi-removal',
    fundingStage: 'Series G ($400M+ total)',
    website: 'astroscale.com',
  },
  {
    name: 'ClearSpace',
    country: 'Switzerland',
    technology: 'Four-arm capture mechanism',
    status: 'ESA contract awarded, launch planned 2026',
    mission: 'ClearSpace-1: Remove Vespa upper stage from orbit',
    fundingStage: 'Series A + ESA contract (~$130M)',
    website: 'clearspace.today',
  },
  {
    name: 'D-Orbit',
    country: 'Italy',
    technology: 'ION satellite carrier, decommissioning devices',
    status: 'Operational (multiple ION missions flown)',
    mission: 'Last-mile delivery and end-of-life deorbiting services',
    fundingStage: 'Series C ($300M+ total)',
    website: 'd-orbit.com',
  },
  {
    name: 'Neumann Space',
    country: 'Australia',
    technology: 'In-space electric propulsion for repositioning/deorbit',
    status: 'Technology demonstration phase',
    mission: 'Propulsion systems enabling satellite deorbit capability',
    fundingStage: 'Series A',
    website: 'neumannspace.com',
  },
  {
    name: 'Orbit Fab',
    country: 'USA',
    technology: 'In-orbit refueling (RAFTI interface)',
    status: 'Fuel depot launched (Tanker-002)',
    mission: 'Enabling life extension to reduce debris creation',
    fundingStage: 'Series A ($28.5M)',
    website: 'orbitfab.com',
  },
  {
    name: 'TransAstra',
    country: 'USA',
    technology: 'Capture bags using inflatable structures',
    status: 'NASA contract, prototype development',
    mission: 'Flytrap debris capture for large rocket bodies',
    fundingStage: 'Seed + NASA contracts',
    website: 'transastra.com',
  },
  {
    name: 'Kall Morris Inc. (KMI)',
    country: 'USA',
    technology: 'Robotic grapple and deorbit',
    status: 'Early development, NASA SBIR funded',
    mission: 'Autonomous debris capture and controlled reentry',
    fundingStage: 'Pre-Series A / NASA SBIR',
    website: 'kallmorrisinc.com',
  },
  {
    name: 'Skyrora',
    country: 'UK / Ukraine',
    technology: 'Space tug with orbital transfer vehicle',
    status: 'Development, suborbital tests completed',
    mission: 'Debris deorbit via orbital transfer vehicle',
    fundingStage: 'Series B',
    website: 'skyrora.com',
  },
];

const MITIGATION_TECHNOLOGIES: MitigationTech[] = [
  {
    name: 'Drag Sails',
    category: 'Passive Deorbit',
    readiness: 'Flight-proven',
    description:
      'Deployable membrane that increases atmospheric drag, accelerating orbital decay from decades to months. Lightweight, low-cost addition to satellites.',
    pros: ['Low mass (<2 kg)', 'No propellant needed', 'Simple deployment mechanism', 'Cost-effective'],
    cons: ['LEO-only effectiveness', 'Can create new collision cross-section', 'Limited altitude range'],
    trl: 9,
  },
  {
    name: 'Electrodynamic Tethers',
    category: 'Active Deorbit',
    readiness: 'Demonstrated',
    description:
      'Conducting tether interacts with Earth\'s magnetic field to generate Lorentz force, deorbiting satellite without propellant. Can also boost orbits by reversing current.',
    pros: ['No propellant required', 'Reversible (boost/deorbit)', 'Effective across LEO range'],
    cons: ['Tether severing risk from micrometeorites', 'Complex deployment', 'LEO-only'],
    trl: 6,
  },
  {
    name: 'Laser Ablation',
    category: 'Ground/Space-Based Removal',
    readiness: 'Research phase',
    description:
      'High-power laser vaporizes surface material on debris, creating thrust impulse to alter orbit. Can be ground-based or space-based. Targets debris without physical contact.',
    pros: ['No physical contact needed', 'Can target many objects', 'Reusable system'],
    cons: ['High power requirements', 'Limited by atmospheric effects (ground)', 'Dual-use weapon concerns', 'Expensive'],
    trl: 3,
  },
  {
    name: 'Nets & Harpoons',
    category: 'Capture Mechanisms',
    readiness: 'Flight-tested',
    description:
      'Net is deployed to envelop target debris, or harpoon is fired to anchor to it. RemoveDEBRIS mission (2018) successfully demonstrated both approaches in orbit.',
    pros: ['Handles tumbling objects', 'Works on various shapes', 'Flight heritage (RemoveDEBRIS)'],
    cons: ['Single-use per capture device', 'Risk of creating secondary debris', 'Proximity operations required'],
    trl: 7,
  },
  {
    name: 'Robotic Arms',
    category: 'Capture Mechanisms',
    readiness: 'Operational (ISS heritage)',
    description:
      'Articulated robotic manipulators grapple and secure debris for controlled deorbit. Extensive heritage from ISS Canadarm2 and various servicing missions.',
    pros: ['Precise control', 'Reusable for multiple targets', 'Well-understood technology'],
    cons: ['Requires cooperative or stable target', 'Complex GNC needed', 'Heavy system mass'],
    trl: 7,
  },
  {
    name: 'Ion Beam Shepherd',
    category: 'Contactless Removal',
    readiness: 'Research phase',
    description:
      'Spacecraft fires ion thruster plume at debris to transfer momentum and push it into a decay orbit. No physical contact eliminates secondary debris risk.',
    pros: ['No physical contact', 'Can handle tumbling objects', 'Multiple targets possible'],
    cons: ['Low thrust requires long engagement', 'Complex orbit matching needed', 'High propellant mass'],
    trl: 4,
  },
  {
    name: 'Magnetic Capture',
    category: 'Capture Mechanisms',
    readiness: 'Flight-demonstrated',
    description:
      'Pre-installed magnetic docking plate on satellites enables servicer spacecraft to magnetically capture and deorbit end-of-life spacecraft. Pioneered by Astroscale ELSA-d.',
    pros: ['Simple, reliable capture', 'Flight heritage', 'Compatible with tumbling targets'],
    cons: ['Requires pre-installed plate', 'Not useful for legacy debris', 'Limited to prepared satellites'],
    trl: 7,
  },
  {
    name: 'Foam/Adhesive Capture',
    category: 'Capture Mechanisms',
    readiness: 'Lab testing',
    description:
      'Expanding foam or adhesive deployed on debris to increase drag area or enable grappling. Novel approach that could handle irregular debris shapes.',
    pros: ['Conforms to any shape', 'Increases drag naturally', 'Lightweight deployment'],
    cons: ['Unproven in orbit', 'Possible outgassing issues', 'Difficult to control expansion'],
    trl: 3,
  },
];

const REGULATIONS: Regulation[] = [
  {
    body: 'IADC (Inter-Agency Space Debris Coordination Committee)',
    guideline: 'IADC Space Debris Mitigation Guidelines',
    year: 2002,
    scope: '13 member space agencies worldwide',
    keyPoints: [
      '25-year post-mission deorbit rule (original standard)',
      'Passivation of spacecraft and upper stages after end of mission',
      'Limit debris released during normal operations',
      'Avoid intentional destruction and breakups in orbit',
      'Minimize collision potential through conjunction assessment',
    ],
  },
  {
    body: 'UN COPUOS',
    guideline: 'Space Debris Mitigation Guidelines of the Committee on the Peaceful Uses of Outer Space',
    year: 2010,
    scope: 'All UN member states',
    keyPoints: [
      'Voluntary guidelines adopted by UN General Assembly',
      'Based on IADC guidelines framework',
      'Limit debris during normal operations',
      'Minimize breakup potential during operational and post-mission phases',
      'Long-term sustainability guidelines added in 2019',
    ],
  },
  {
    body: 'FCC (Federal Communications Commission)',
    guideline: '5-Year Post-Mission Disposal Rule',
    year: 2022,
    scope: 'All FCC-licensed satellites (US + foreign-licensed operating in US)',
    keyPoints: [
      'Reduced deorbit timeline from 25 years to 5 years post-mission',
      'Applies to LEO satellites seeking FCC licensing',
      'Effective September 2024 for new applications',
      'Industry pushback from operators citing technical feasibility',
      'First binding US debris regulation with enforcement teeth',
    ],
  },
  {
    body: 'ESA',
    guideline: 'Zero Debris Charter',
    year: 2023,
    scope: 'ESA member states and participating entities',
    keyPoints: [
      'Target zero debris generation by 2030',
      'Active debris removal demonstration missions funded',
      'ClearSpace-1 mission as flagship ADR project',
      'Design-for-demise standards for spacecraft',
      'Debris environment modeling and monitoring investment',
    ],
  },
  {
    body: 'ISO',
    guideline: 'ISO 24113:2019 Space Debris Mitigation Requirements',
    year: 2019,
    scope: 'International standard for spacecraft designers and operators',
    keyPoints: [
      'Top-level requirements for debris mitigation',
      'Applicable to all orbital regimes',
      'Casualty risk assessment for reentry',
      'Disposal orbit requirements and verification',
      'Referenced by national regulatory frameworks worldwide',
    ],
  },
];

const TABS: { id: ActiveTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'events', label: 'Major Events', icon: '💥' },
  { id: 'removal', label: 'Active Removal', icon: '🛠️' },
  { id: 'regulations', label: 'Regulations', icon: '📜' },
  { id: 'technology', label: 'Mitigation Tech', icon: '⚙️' },
];

// ════════════════════════════════════════
// Helper Components
// ════════════════════════════════════════

function TrendIndicator({ trend }: { trend?: 'up' | 'down' | 'stable' }) {
  if (!trend) return null;
  const icons = { up: '↑', down: '↓', stable: '→' };
  const colors = { up: 'text-red-400', down: 'text-green-400', stable: 'text-slate-400' };
  return <span className={`text-sm font-bold ${colors[trend]}`}>{icons[trend]}</span>;
}

function SeverityBadge({ severity }: { severity: 'critical' | 'high' | 'medium' }) {
  const styles = {
    critical: 'bg-red-500/20 text-red-300 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles[severity]}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function TRLBar({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            level >= 7 ? 'bg-green-500' : level >= 5 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${(level / 9) * 100}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-12">TRL {level}/9</span>
    </div>
  );
}

function PercentageBar({ percentage, color }: { percentage: number; color: string }) {
  return (
    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}

// ════════════════════════════════════════
// Main Page Component
// ════════════════════════════════════════

export default function DebrisTrackerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Space Debris Tracker"
          subtitle="Monitoring the growing orbital debris environment -- tracking objects, collision risks, removal efforts, and international mitigation frameworks shaping the future of space sustainability."
          icon={<span>🛰️</span>}
          accentColor="red"
          breadcrumb="Space Environment / Debris"
        />

        {/* Tab Navigation */}
        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-800 pb-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'removal' && <RemovalTab />}
        {activeTab === 'regulations' && <RegulationsTab />}
        {activeTab === 'technology' && <TechnologyTab />}

        {/* Related Links */}
        <ScrollReveal delay={0.2}>
          <div className="mt-12 pt-8 border-t border-slate-800">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Related Modules</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: '/space-environment', label: 'Space Environment', icon: '🌍' },
                { href: '/satellites', label: 'Satellite Operations', icon: '📡' },
                { href: '/compliance', label: 'Regulations & Compliance', icon: '⚖️' },
                { href: '/tech-readiness', label: 'Tech Readiness', icon: '🔬' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-red-500/30 hover:bg-slate-800/50 transition-all group"
                >
                  <span className="text-xl">{link.icon}</span>
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['debris-tracker']} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// Overview Tab
// ════════════════════════════════════════

function OverviewTab() {
  return (
    <div className="space-y-8">
      {/* Key Statistics */}
      <ScrollReveal>
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Key Debris Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {KEY_STATISTICS.map((stat) => (
            <div
              key={stat.label}
              className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-red-500/20 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-400">{stat.label}</span>
                <TrendIndicator trend={stat.trend} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.detail}</p>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Debris by Orbit */}
      <ScrollReveal delay={0.1}>
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Debris Distribution by Orbit</h2>
        <div className="space-y-4">
          {ORBIT_DISTRIBUTION.map((orbit) => (
            <div
              key={orbit.orbit}
              className="p-5 rounded-xl bg-slate-900/60 border border-slate-800"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                <div>
                  <h3 className="font-semibold text-slate-100">{orbit.orbit}</h3>
                  <p className="text-xs text-slate-500">Altitude: {orbit.altitude}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-slate-200">{orbit.tracked}</span>
                  <span className="text-sm text-slate-400 ml-2">tracked objects</span>
                </div>
              </div>
              <PercentageBar percentage={orbit.percentage} color={orbit.color} />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-slate-500">{orbit.percentage}% of total cataloged debris</p>
              </div>
              <p className="text-sm text-slate-400 mt-3">{orbit.description}</p>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Conjunction Assessments */}
      <ScrollReveal delay={0.2}>
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Conjunction Assessment Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 className="font-semibold text-slate-200 mb-3">Daily Operations</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#9679;</span>
                <span>18th Space Defense Squadron screens ~47,000 catalog objects daily</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#9679;</span>
                <span>~1,600 conjunction data messages (CDMs) issued per week to operators</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#9679;</span>
                <span>Average 3-5 high-risk conjunction events per day flagged for operator action</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#9679;</span>
                <span>Collision probability threshold for maneuver: typically 1 in 10,000</span>
              </li>
            </ul>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 className="font-semibold text-slate-200 mb-3">Avoidance Maneuver Statistics</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#9679;</span>
                <span>ISS performs 1-3 avoidance maneuvers per month on average</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#9679;</span>
                <span>SpaceX Starlink performs ~10,000 autonomous avoidance maneuvers per month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#9679;</span>
                <span>ESA spacecraft averaged 2-3 collision avoidance maneuvers per satellite/year</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#9679;</span>
                <span>Maneuver cost: 0.1-5 m/s delta-v per event depending on urgency and orbit</span>
              </li>
            </ul>
          </div>
        </div>
      </ScrollReveal>

      {/* Kessler Syndrome Explainer */}
      <ScrollReveal delay={0.3}>
        <div className="p-6 rounded-xl bg-gradient-to-br from-red-950/40 to-slate-900/60 border border-red-500/20">
          <h2 className="text-xl font-semibold text-red-300 mb-3">Kessler Syndrome: The Cascading Threat</h2>
          <p className="text-sm text-slate-300 mb-4">
            Proposed by NASA scientist Donald Kessler in 1978, this scenario describes a self-sustaining
            cascade of collisions in LEO. Each collision generates debris fragments, which in turn cause
            further collisions, creating an exponentially growing debris field that could render certain
            orbital bands unusable for generations.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-slate-900/50">
              <p className="text-xs text-slate-400 mb-1">Critical Density Threshold</p>
              <p className="text-sm text-slate-200">
                Some LEO altitude bands (700-1,000 km) may already exceed the critical density
                where cascade becomes self-sustaining even without new launches.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50">
              <p className="text-xs text-slate-400 mb-1">Timeframe</p>
              <p className="text-sm text-slate-200">
                Models suggest without active removal of ~5 large objects per year, debris population
                will grow uncontrollably within 50-100 years in the worst-case LEO bands.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50">
              <p className="text-xs text-slate-400 mb-1">Economic Impact</p>
              <p className="text-sm text-slate-200">
                The space economy ($546B in 2024) depends on safe orbital access. Kessler syndrome
                could increase launch costs 10-100x and strand $1T+ in orbital infrastructure.
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

// ════════════════════════════════════════
// Events Tab
// ════════════════════════════════════════

function EventsTab() {
  return (
    <div className="space-y-6">
      <ScrollReveal>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">Major Debris-Generating Events</h2>
        <p className="text-sm text-slate-400 mb-6">
          A small number of catastrophic events account for a disproportionate share of tracked orbital
          debris. These events demonstrate the fragility of the orbital environment and the long-lasting
          consequences of irresponsible space operations.
        </p>
      </ScrollReveal>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-800" />
        <div className="space-y-6">
          {MAJOR_EVENTS.map((event, index) => (
            <ScrollReveal key={event.name} delay={index * 0.08}>
              <div className="relative pl-12">
                <div className="absolute left-2.5 w-3 h-3 rounded-full bg-red-500 border-2 border-slate-950" />
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-red-500/20 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-red-400 font-bold">{event.year}</span>
                      <h3 className="font-semibold text-slate-100">{event.name}</h3>
                    </div>
                    <SeverityBadge severity={event.severity} />
                  </div>
                  <p className="text-sm text-slate-400 mb-3">{event.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2 rounded bg-slate-800/50">
                      <span className="text-slate-500">Fragments Created:</span>
                      <span className="text-slate-200 ml-1 font-medium">{event.fragments}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-800/50">
                      <span className="text-slate-500">Orbit:</span>
                      <span className="text-slate-200 ml-1 font-medium">{event.orbit}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-800/50">
                      <span className="text-slate-500">Current Status:</span>
                      <span className="text-slate-200 ml-1 font-medium">{event.stillTracked}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Summary card */}
      <ScrollReveal delay={0.3}>
        <div className="p-5 rounded-xl bg-slate-900/60 border border-red-500/20">
          <h3 className="font-semibold text-slate-200 mb-3">Debris Event Impact Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-red-400">3</p>
              <p className="text-xs text-slate-400">ASAT tests creating debris</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">7,700+</p>
              <p className="text-xs text-slate-400">Fragments from top 3 events</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">5,300+</p>
              <p className="text-xs text-slate-400">Still tracked from those events</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-400">100+ yrs</p>
              <p className="text-xs text-slate-400">Estimated orbital lifetime</p>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

// ════════════════════════════════════════
// Removal Tab
// ════════════════════════════════════════

function RemovalTab() {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">Active Debris Removal (ADR) Companies</h2>
        <p className="text-sm text-slate-400 mb-6">
          A growing ecosystem of commercial companies and government programs are developing technologies
          to actively remove debris from orbit. The ADR market is projected to reach $2.9B by 2030,
          driven by regulatory pressure and growing collision risks.
        </p>
      </ScrollReveal>

      {/* Market opportunity card */}
      <ScrollReveal delay={0.05}>
        <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-900/60 border border-emerald-500/20 mb-6">
          <h3 className="font-semibold text-emerald-300 mb-3">ADR Market Opportunity</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-emerald-400">$2.9B</p>
              <p className="text-xs text-slate-400">Projected market by 2030</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">30+</p>
              <p className="text-xs text-slate-400">Companies in ADR space</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">$1.2B+</p>
              <p className="text-xs text-slate-400">Total funding raised</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">5-10</p>
              <p className="text-xs text-slate-400">Objects removed/year target</p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Company cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REMOVAL_COMPANIES.map((company, index) => (
          <ScrollReveal key={company.name} delay={index * 0.06}>
            <div
              className={`p-5 rounded-xl bg-slate-900/60 border transition-all cursor-pointer ${
                expandedCompany === company.name
                  ? 'border-red-500/30 bg-slate-900/80'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
              onClick={() =>
                setExpandedCompany(expandedCompany === company.name ? null : company.name)
              }
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-slate-100">{company.name}</h3>
                  <p className="text-xs text-slate-500">{company.country}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {company.fundingStage}
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-2">{company.technology}</p>
              <p className="text-xs text-slate-500 mb-2">
                <span className="text-slate-400 font-medium">Status:</span> {company.status}
              </p>
              {expandedCompany === company.name && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <p className="text-sm text-slate-300 mb-2">
                    <span className="text-slate-400 font-medium">Key Mission:</span> {company.mission}
                  </p>
                  <a
                    href={`https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Visit {company.website} &rarr;
                  </a>
                </div>
              )}
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// Regulations Tab
// ════════════════════════════════════════

function RegulationsTab() {
  return (
    <div className="space-y-6">
      <ScrollReveal>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">International Debris Mitigation Guidelines</h2>
        <p className="text-sm text-slate-400 mb-6">
          The international regulatory landscape for space debris is evolving rapidly. While most guidelines
          remain voluntary, the trend toward binding national regulations is accelerating, driven by the
          growing commercial space industry and worsening debris environment.
        </p>
      </ScrollReveal>

      {/* Regulation timeline */}
      <div className="space-y-4">
        {REGULATIONS.map((reg, index) => (
          <ScrollReveal key={reg.guideline} delay={index * 0.08}>
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-red-500/20 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                <div>
                  <h3 className="font-semibold text-slate-100">{reg.body}</h3>
                  <p className="text-sm text-slate-300 mt-0.5">{reg.guideline}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-red-400 font-bold">{reg.year}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {reg.scope}
                  </span>
                </div>
              </div>
              <ul className="space-y-1.5">
                {reg.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="text-red-400 mt-1 text-xs">&#9670;</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Key regulatory trends */}
      <ScrollReveal delay={0.3}>
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <h3 className="font-semibold text-slate-200 mb-3">Key Regulatory Trends</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-slate-800/50">
              <p className="text-sm font-medium text-red-300 mb-1">Shorter Deorbit Timelines</p>
              <p className="text-xs text-slate-400">
                The industry standard is shifting from 25 years to 5 years post-mission deorbit,
                with the FCC leading regulatory enforcement. ESA targets zero debris by 2030.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50">
              <p className="text-sm font-medium text-amber-300 mb-1">Binding vs. Voluntary</p>
              <p className="text-xs text-slate-400">
                Most international guidelines remain voluntary. However, national regulators
                (FCC, Ofcom, CNES) are increasingly making debris rules legally binding
                for licensing.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50">
              <p className="text-sm font-medium text-cyan-300 mb-1">Financial Responsibility</p>
              <p className="text-xs text-slate-400">
                Proposals for debris removal bonds, orbital-use fees, and insurance mandates
                are advancing in the US, EU, and UK to internalize the cost of debris risk.
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

// ════════════════════════════════════════
// Technology Tab
// ════════════════════════════════════════

function TechnologyTab() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(MITIGATION_TECHNOLOGIES.map((t) => t.category)))];

  const filteredTech =
    selectedCategory === 'all'
      ? MITIGATION_TECHNOLOGIES
      : MITIGATION_TECHNOLOGIES.filter((t) => t.category === selectedCategory);

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">Debris Mitigation Technologies</h2>
        <p className="text-sm text-slate-400 mb-4">
          From passive deorbit devices to active removal systems, a diverse portfolio of technologies
          is under development to address the growing debris problem. Technology Readiness Level (TRL)
          indicates maturity from basic research (1) to flight-proven (9).
        </p>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/50 border border-slate-700'
              }`}
            >
              {cat === 'all' ? 'All Technologies' : cat}
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* Technology cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTech.map((tech, index) => (
          <ScrollReveal key={tech.name} delay={index * 0.06}>
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-red-500/20 transition-all h-full flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-slate-100">{tech.name}</h3>
                  <p className="text-xs text-slate-500">{tech.category}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    tech.trl >= 7
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : tech.trl >= 5
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  {tech.readiness}
                </span>
              </div>

              <TRLBar level={tech.trl} />

              <p className="text-sm text-slate-400 mt-3 mb-3 flex-grow">{tech.description}</p>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <div>
                  <p className="text-xs text-green-400 font-medium mb-1">Advantages</p>
                  <ul className="space-y-1">
                    {tech.pros.map((pro, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-1">
                        <span className="text-green-500 mt-0.5">+</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-red-400 font-medium mb-1">Challenges</p>
                  <ul className="space-y-1">
                    {tech.cons.map((con, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-1">
                        <span className="text-red-500 mt-0.5">-</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Technology comparison summary */}
      <ScrollReveal delay={0.3}>
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <h3 className="font-semibold text-slate-200 mb-3">Technology Maturity Spectrum</h3>
          <div className="space-y-2">
            {[
              { label: 'Flight-Proven (TRL 7-9)', count: MITIGATION_TECHNOLOGIES.filter((t) => t.trl >= 7).length, color: 'bg-green-500', textColor: 'text-green-400' },
              { label: 'Demonstrated (TRL 5-6)', count: MITIGATION_TECHNOLOGIES.filter((t) => t.trl >= 5 && t.trl < 7).length, color: 'bg-amber-500', textColor: 'text-amber-400' },
              { label: 'Research Phase (TRL 1-4)', count: MITIGATION_TECHNOLOGIES.filter((t) => t.trl < 5).length, color: 'bg-red-500', textColor: 'text-red-400' },
            ].map((tier) => (
              <div key={tier.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                <span className="text-sm text-slate-400 flex-1">{tier.label}</span>
                <span className={`text-sm font-bold ${tier.textColor}`}>
                  {tier.count} technologies
                </span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
