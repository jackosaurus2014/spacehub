'use client';

import { useState } from 'react';

// Re-declare types needed for this component (avoids coupling to parent module)
interface DSNAntenna {
  designation: string;
  diameter: string;
  type: string;
  bands: string[];
  maxDataRate: string;
  features: string;
}

interface DSNComplex {
  id: string;
  name: string;
  location: string;
  coordinates: string;
  country: string;
  antennas: DSNAntenna[];
  missionsServed: string[];
  description: string;
  established: number;
}

interface RelayNetwork {
  id: string;
  name: string;
  operator: string;
  constellation: string;
  orbit: string;
  coverage: string;
  status: 'operational' | 'deploying' | 'development' | 'decommissioning';
  capabilities: string[];
  dataRate: string;
  description: string;
  users: string[];
}

interface OpticalSystem {
  id: string;
  name: string;
  operator: string;
  status: 'operational' | 'demonstrated' | 'development' | 'commercial';
  type: 'demonstration' | 'relay' | 'terminal' | 'deep-space';
  maxDataRate: string;
  wavelength: string;
  distance: string;
  launchDate: string;
  description: string;
  milestones: string[];
}

interface CCSDSProtocol {
  name: string;
  abbreviation: string;
  layer: string;
  description: string;
  usedBy: string[];
}

interface FrequencyAllocation {
  band: string;
  range: string;
  allocation: string;
  typicalUse: string;
  maxDataRate: string;
  color: string;
}

interface LunarCommsElement {
  id: string;
  name: string;
  agency: string;
  status: string;
  statusColor: string;
  description: string;
  keyFeatures: string[];
}

interface LatencyEntry {
  orbit: string;
  oneWayLatency: string;
  roundTrip: string;
  example: string;
  color: string;
}

interface CommsHeroStat {
  label: string;
  value: string;
  color: string;
}

interface EstrackStation {
  name: string;
  location: string;
  diameter: string;
  bands: string;
  role: string;
}

type CommsSubTab = 'dsn' | 'relay' | 'optical' | 'lunar' | 'standards';

// ── Card Components ──

function DSNComplexCard({ complex }: { complex: DSNComplex }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-elevated p-6 border border-space-700 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">{complex.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-300 text-sm font-medium">{complex.location}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 text-sm">Est. {complex.established}</span>
          </div>
          <p className="text-slate-500 text-xs mt-1">{complex.coordinates}</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded border text-green-400 bg-green-500/10 border-green-500/30">
          Operational
        </span>
      </div>

      <p className="text-slate-400 text-sm leading-relaxed mb-4">
        {expanded ? complex.description : complex.description.slice(0, 200) + '...'}
      </p>

      <div className="mb-4">
        <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Antenna Assets ({complex.antennas.length})</div>
        <div className="space-y-2">
          {complex.antennas.map((antenna) => (
            <div key={antenna.designation} className="bg-space-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm font-medium">{antenna.designation}</span>
                <span className="text-slate-300 text-xs font-bold">{antenna.diameter}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-1">
                {antenna.bands.map((band) => (
                  <span key={band} className="px-1.5 py-0.5 bg-space-700 text-slate-200 border border-space-600 rounded text-xs">
                    {band}
                  </span>
                ))}
              </div>
              {expanded && (
                <div className="mt-2">
                  <p className="text-slate-400 text-xs">{antenna.features}</p>
                  <p className="text-slate-500 text-xs mt-1">Max data rate: {antenna.maxDataRate}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="mb-4">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Missions Served</div>
          <div className="flex flex-wrap gap-1.5">
            {complex.missionsServed.map((mission) => (
              <span key={mission} className="px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded text-xs">
                {mission}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-slate-300 hover:text-white transition-colors"
      >
        {expanded ? 'Show less' : 'Show details'} {expanded ? String.fromCharCode(8593) : String.fromCharCode(8595)}
      </button>
    </div>
  );
}

function RelayNetworkCard({ network }: { network: RelayNetwork }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    operational: 'text-green-400 bg-green-500/10 border-green-500/30',
    deploying: 'text-slate-300 bg-white/5 border-white/10',
    development: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    decommissioning: 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  return (
    <div className="card-elevated p-6 border border-space-700 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg">{network.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-300 text-sm font-medium">{network.operator}</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ml-2 ${statusColors[network.status] || ''}`}>
          {network.status.charAt(0).toUpperCase() + network.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Constellation</div>
          <div className="text-white text-sm font-medium">{network.constellation}</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Data Rate</div>
          <div className="text-white text-sm font-medium">{network.dataRate}</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Orbit</div>
          <div className="text-white text-sm font-medium">{network.orbit}</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Coverage</div>
          <div className="text-white text-sm font-medium">{network.coverage}</div>
        </div>
      </div>

      <p className="text-slate-400 text-sm leading-relaxed mb-4">
        {expanded ? network.description : network.description.slice(0, 180) + '...'}
      </p>

      {expanded && (
        <div className="space-y-4 mb-4">
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Capabilities</div>
            <ul className="space-y-1">
              {network.capabilities.map((cap, i) => (
                <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-slate-300 mt-0.5 flex-shrink-0">-</span>
                  {cap}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Key Users</div>
            <div className="flex flex-wrap gap-1.5">
              {network.users.map((user) => (
                <span key={user} className="px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded text-xs">
                  {user}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-slate-300 hover:text-white transition-colors"
      >
        {expanded ? 'Show less' : 'Show details'} {expanded ? String.fromCharCode(8593) : String.fromCharCode(8595)}
      </button>
    </div>
  );
}

function OpticalSystemCard({ system }: { system: OpticalSystem }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    operational: 'text-green-400 bg-green-500/10 border-green-500/30',
    demonstrated: 'text-slate-300 bg-white/5 border-white/10',
    development: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    commercial: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  };

  const typeLabels: Record<string, string> = {
    demonstration: 'Demo',
    relay: 'Relay',
    terminal: 'Terminal',
    'deep-space': 'Deep Space',
  };

  return (
    <div className="card-elevated p-6 border border-space-700 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg">{system.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-300 text-sm font-medium">{system.operator}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 text-sm">{system.launchDate}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusColors[system.status] || ''}`}>
            {system.status.charAt(0).toUpperCase() + system.status.slice(1)}
          </span>
          <span className="text-xs text-slate-500 px-2 py-0.5 bg-space-800 rounded border border-space-700">
            {typeLabels[system.type]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Max Data Rate</div>
          <div className="text-amber-400 text-sm font-bold">{system.maxDataRate}</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Wavelength</div>
          <div className="text-white text-sm font-medium">{system.wavelength}</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Distance</div>
          <div className="text-white text-sm font-medium">{system.distance}</div>
        </div>
      </div>

      <p className="text-slate-400 text-sm leading-relaxed mb-4">
        {expanded ? system.description : system.description.slice(0, 180) + '...'}
      </p>

      {expanded && (
        <div className="mb-4">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Milestones</div>
          <div className="space-y-1.5">
            {system.milestones.map((milestone, i) => (
              <div key={i} className="text-slate-300 text-sm flex items-start gap-2 bg-space-800/30 rounded-lg p-2">
                <span className="text-slate-300 font-bold text-xs mt-0.5 flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{milestone}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-slate-300 hover:text-white transition-colors"
      >
        {expanded ? 'Show less' : 'Show milestones'} {expanded ? String.fromCharCode(8593) : String.fromCharCode(8595)}
      </button>
    </div>
  );
}

// ── Props interface ──

export interface SpaceportsCommunicationsTabProps {
  commsHeroStats: CommsHeroStat[];
  dsnComplexes: DSNComplex[];
  relayNetworks: RelayNetwork[];
  opticalSystems: OpticalSystem[];
  lunarComms: LunarCommsElement[];
  ccsdsProtocols: CCSDSProtocol[];
  frequencyAllocations: FrequencyAllocation[];
  latencyByOrbit: LatencyEntry[];
  estrackStations: EstrackStation[];
}

// ── Main Component ──

export default function SpaceportsCommunicationsTab({
  commsHeroStats,
  dsnComplexes,
  relayNetworks,
  opticalSystems,
  lunarComms,
  ccsdsProtocols,
  frequencyAllocations,
  latencyByOrbit,
  estrackStations,
}: SpaceportsCommunicationsTabProps) {
  const [commsSubTab, setCommsSubTab] = useState<CommsSubTab>('dsn');
  const [relayFilter, setRelayFilter] = useState<string>('');

  const filteredRelays = relayFilter
    ? relayNetworks.filter((n) => n.status === relayFilter)
    : relayNetworks;

  return (
    <div>
      {/* Comms Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {commsHeroStats.map((stat) => (
          <div key={stat.label} className="card-elevated p-5 text-center">
            <div className={`text-3xl font-bold font-display tracking-tight ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-star-300/60 text-xs uppercase tracking-widest font-medium mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Laser Comms Revolution Banner */}
      <div className="bg-gradient-to-r from-white/5 via-blue-500/10 to-purple-500/10 border border-white/10 rounded-xl p-5 mb-8">
        <div className="flex items-start gap-4">
          <div>
            <h3 className="font-semibold text-white mb-1">The Laser Communications Revolution</h3>
            <p className="text-sm text-star-300 leading-relaxed">
              Space communications is undergoing its most significant transformation since the advent of satellite relay systems.
              NASA&apos;s DSOC experiment achieved 267 Mbps from deep space -- 10-100x faster than radio -- while SpaceX has deployed
              over 9,000 laser terminals on Starlink satellites, creating the largest optical network in space. The SDA Transport
              Layer is building a military mesh network using optical crosslinks, and ESA&apos;s EDRS &quot;SpaceDataHighway&quot; has completed
              over 50,000 successful laser relay sessions. By the end of this decade, optical communications will become the
              standard for high-rate space data links, complementing -- not replacing -- proven RF systems for command and control.
            </p>
          </div>
        </div>
      </div>

      {/* Comms Sub-Tab Navigation */}
      <div className="border-b border-space-700 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {([
            { id: 'dsn' as CommsSubTab, label: 'DSN Status' },
            { id: 'relay' as CommsSubTab, label: 'Relay Networks' },
            { id: 'optical' as CommsSubTab, label: 'Optical Comms' },
            { id: 'lunar' as CommsSubTab, label: 'Lunar Comms' },
            { id: 'standards' as CommsSubTab, label: 'Standards' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCommsSubTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                commsSubTab === tab.id
                  ? 'border-white/15 text-slate-200'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comms Sub-Tab Content */}
      <div>
        {/* DSN STATUS */}
        {commsSubTab === 'dsn' && (
          <div>
            <div className="card-elevated p-6 border border-space-700 mb-6">
              <h3 className="text-white font-semibold text-lg mb-2">NASA Deep Space Network (DSN)</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                The Deep Space Network is NASA&apos;s international array of giant radio antennas supporting interplanetary
                spacecraft missions and radio/radar astronomy observations. Managed by JPL, the DSN consists of three
                complexes placed approximately 120 degrees apart around the Earth -- Goldstone (California), Canberra
                (Australia), and Madrid (Spain) -- ensuring that any spacecraft in deep space can communicate with at
                least one complex at all times as the Earth rotates.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-space-800/50 rounded-lg p-3"><div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Complexes</div><div className="text-slate-300 text-lg font-bold">3</div></div>
                <div className="bg-space-800/50 rounded-lg p-3"><div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Total Antennas</div><div className="text-slate-300 text-lg font-bold">13</div></div>
                <div className="bg-space-800/50 rounded-lg p-3"><div className="text-slate-500 text-xs uppercase tracking-widest mb-1">70m Dishes</div><div className="text-slate-300 text-lg font-bold">3</div></div>
                <div className="bg-space-800/50 rounded-lg p-3"><div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Missions Supported</div><div className="text-slate-300 text-lg font-bold">40+</div></div>
              </div>
            </div>

            <div className="space-y-5 mb-6">
              {dsnComplexes.map((complex) => (
                <DSNComplexCard key={complex.id} complex={complex} />
              ))}
            </div>

            <div className="card-elevated p-6 border border-space-700 mb-6">
              <h3 className="text-white font-semibold mb-4">DSN Antenna Types</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-space-700"><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Type</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Diameter</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Frequency Bands</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Typical Use</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Count</th></tr></thead>
                  <tbody>
                    {[
                      { type: '70m Cassegrain', diameter: '70m', bands: 'S/X-band', use: 'Critical encounters, emergency comms, Voyager, planetary radar', count: '3 (one per complex)' },
                      { type: '34m Beam Waveguide (BWG)', diameter: '34m', bands: 'S/X/Ka-band', use: 'Primary deep space tracking, Ka-band high-rate data, arraying', count: '8' },
                      { type: '34m High Efficiency (HEF)', diameter: '34m', bands: 'S/X-band', use: 'Legacy missions, supplementary tracking, radio science', count: '2' },
                    ].map((row, idx) => (
                      <tr key={idx} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                        <td className="py-2 px-3 text-white font-medium">{row.type}</td><td className="py-2 px-3 text-slate-300 font-bold">{row.diameter}</td><td className="py-2 px-3 text-slate-300">{row.bands}</td><td className="py-2 px-3 text-slate-400">{row.use}</td><td className="py-2 px-3 text-white">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card-elevated p-6 border border-space-700">
              <h3 className="text-white font-semibold mb-2">ESA ESTRACK Ground Station Network</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                ESA operates the European Space Tracking (ESTRACK) network, a global system of ground stations supporting
                ESA missions from launch through end of life. The network includes three 35m deep space antennas spaced
                around the globe -- mirroring the DSN architecture -- plus smaller stations for LEO and launch support.
                ESA and NASA maintain cross-support agreements through CCSDS Space Link Extension (SLE) protocols.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-space-700"><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Station</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Location</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Diameter</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Bands</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Role</th></tr></thead>
                  <tbody>
                    {estrackStations.map((station, idx) => (
                      <tr key={station.name} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                        <td className="py-2 px-3 text-white font-medium">{station.name}</td><td className="py-2 px-3 text-slate-300">{station.location}</td><td className="py-2 px-3 text-slate-300 font-bold">{station.diameter}</td><td className="py-2 px-3 text-slate-300">{station.bands}</td><td className="py-2 px-3 text-slate-400">{station.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* RELAY NETWORKS */}
        {commsSubTab === 'relay' && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="text-slate-400 text-sm">Filter by status:</span>
              {['', 'operational', 'deploying', 'development'].map((status) => (
                <button key={status} onClick={() => setRelayFilter(status)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${relayFilter === status ? 'bg-white/10 text-slate-200 border border-white/15' : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600 hover:text-white'}`}>
                  {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">{filteredRelays.map((network) => (<RelayNetworkCard key={network.id} network={network} />))}</div>
            {filteredRelays.length === 0 && (<div className="text-center py-12"><p className="text-slate-400">No networks match the selected filter.</p></div>)}

            <div className="card-elevated p-6 border border-space-700 mb-6">
              <h3 className="text-white font-semibold mb-4">Relay Architecture Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-space-700"><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Network</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Orbit</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Link Type</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Data Rate</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Coverage</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Status</th></tr></thead>
                  <tbody>
                    {[
                      { name: 'TDRSS', orbit: 'GEO', link: 'RF (S/Ku/Ka)', rate: '800 Mbps', coverage: '~85% LEO', status: 'Operational' },
                      { name: 'EDRS', orbit: 'GEO', link: 'Laser + Ka', rate: '1.8 Gbps', coverage: 'Europe/Atlantic', status: 'Operational' },
                      { name: 'SDA Transport', orbit: 'LEO', link: 'Optical mesh', rate: '10 Gbps/link', coverage: 'Global (military)', status: 'Deploying' },
                      { name: 'Starshield', orbit: 'LEO', link: 'Laser mesh', rate: 'Classified', coverage: 'Global', status: 'Deploying' },
                      { name: 'AWS GS', orbit: 'Ground', link: 'RF (S/X/UHF)', rate: '800 Mbps', coverage: 'Global (12 sites)', status: 'Operational' },
                      { name: 'Azure Orbital', orbit: 'Ground', link: 'RF (S/X/Ka)', rate: '1+ Gbps', coverage: 'Global (partners)', status: 'Operational' },
                    ].map((row, idx) => (
                      <tr key={idx} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                        <td className="py-2 px-3 text-white font-medium">{row.name}</td><td className="py-2 px-3 text-slate-300">{row.orbit}</td><td className="py-2 px-3 text-slate-300">{row.link}</td><td className="py-2 px-3 text-amber-400 font-medium">{row.rate}</td><td className="py-2 px-3 text-slate-300">{row.coverage}</td>
                        <td className="py-2 px-3"><span className={`text-xs font-bold px-2 py-0.5 rounded ${row.status === 'Operational' ? 'text-green-400 bg-green-500/10' : row.status === 'Deploying' ? 'text-slate-300 bg-white/5' : 'text-amber-400 bg-amber-500/10'}`}>{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card-elevated p-6 border border-space-700">
              <h3 className="text-white font-semibold mb-4">Relay Network Insights</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3"><span className="text-slate-300 font-bold text-sm mt-0.5 flex-shrink-0">01</span><p className="text-slate-300 text-sm"><strong className="text-white">TDRSS is aging without a direct replacement.</strong> The newest TDRS satellite launched in 2017, and NASA is evaluating commercial alternatives for LEO relay services. The transition from government-owned to commercially-provided relay infrastructure is a major strategic shift for the 2030s.</p></div>
                <div className="flex items-start gap-3"><span className="text-slate-300 font-bold text-sm mt-0.5 flex-shrink-0">02</span><p className="text-slate-300 text-sm"><strong className="text-white">Optical inter-satellite links are the new standard.</strong> SDA, SpaceX, and Telesat are all building constellations with laser crosslinks. This eliminates ground station dependency for data routing and reduces latency for global data transport.</p></div>
                <div className="flex items-start gap-3"><span className="text-slate-300 font-bold text-sm mt-0.5 flex-shrink-0">03</span><p className="text-slate-300 text-sm"><strong className="text-white">Cloud-integrated ground services are disrupting traditional ground segments.</strong> AWS Ground Station and Azure Orbital enable operators to process satellite data in cloud environments within seconds of antenna contact, eliminating complex data distribution infrastructure.</p></div>
              </div>
            </div>
          </div>
        )}

        {/* OPTICAL COMMS */}
        {commsSubTab === 'optical' && (
          <div>
            <div className="card-elevated p-6 border border-amber-500/20 mb-6">
              <h3 className="text-amber-400 font-semibold text-lg mb-2">The Laser Communications Revolution</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Laser (optical) communications represent the biggest leap in space data rates since the transition
                from S-band to X-band in the 1970s. Unlike radio frequency (RF) systems, laser beams have extremely
                narrow divergence, concentrating energy on the receiver and enabling data rates 10-100x higher than
                RF at comparable power levels. The challenge: laser links require precise pointing (sub-microradian)
                and are affected by atmospheric conditions for space-to-ground links.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-amber-400 text-lg font-bold">267 Mbps</div><div className="text-slate-500 text-xs">DSOC deep space record</div></div>
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-amber-400 text-lg font-bold">100 Gbps</div><div className="text-slate-500 text-xs">Commercial OISL capability</div></div>
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-amber-400 text-lg font-bold">9,000+</div><div className="text-slate-500 text-xs">Starlink laser terminals</div></div>
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-amber-400 text-lg font-bold">50,000+</div><div className="text-slate-500 text-xs">EDRS laser link sessions</div></div>
              </div>
            </div>

            <div className="card-elevated p-6 border border-space-700 mb-6">
              <h3 className="text-white font-semibold mb-4">RF vs. Optical Communications Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-space-700"><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Parameter</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">RF (X/Ka-band)</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Optical (Laser)</th></tr></thead>
                  <tbody>
                    {[
                      { param: 'Max Data Rate', rf: '~1-10 Gbps', optical: '~100 Gbps' },
                      { param: 'Beam Divergence', rf: '~0.1-1 degree', optical: '~0.001 degree (sub-microradian)' },
                      { param: 'Spectrum Licensing', rf: 'Required (ITU coordination)', optical: 'Not required (unregulated)' },
                      { param: 'Atmospheric Effects', rf: 'Rain fade (Ka), minimal (S/X)', optical: 'Cloud blockage, turbulence, scintillation' },
                      { param: 'Terminal Size/Weight', rf: 'Large (0.5-10m dishes)', optical: 'Compact (10-30 cm aperture)' },
                      { param: 'Pointing Requirement', rf: 'Moderate (~0.01 deg)', optical: 'Extreme (~1 microradian)' },
                      { param: 'Deep Space Heritage', rf: 'Decades (proven)', optical: 'DSOC 2023 (first demonstration)' },
                      { param: 'All-Weather Operation', rf: 'Yes (S/X-band)', optical: 'No (requires site diversity)' },
                    ].map((row, idx) => (
                      <tr key={idx} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}><td className="py-2 px-3 text-white font-medium">{row.param}</td><td className="py-2 px-3 text-slate-300">{row.rf}</td><td className="py-2 px-3 text-amber-400">{row.optical}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">{opticalSystems.map((system) => (<OpticalSystemCard key={system.id} system={system} />))}</div>

            <div className="card-elevated p-6 border border-white/10">
              <h3 className="text-slate-300 font-semibold mb-4">DSOC: Rewriting the Deep Space Communications Playbook</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                NASA&apos;s Deep Space Optical Communications (DSOC) experiment on the Psyche spacecraft has
                fundamentally demonstrated that laser communications work in deep space. The system achieved
                267 Mbps from 33 million km -- a data rate that would have taken the best RF system roughly
                10x longer to transmit the same data volume. During its technology demonstration phase, DSOC
                transmitted 1.58 terabits of data from distances up to 2.6 AU (390 million km).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-space-800/50 rounded-xl p-4"><div className="text-slate-300 text-2xl font-bold mb-1">10-100x</div><div className="text-slate-400 text-sm">Faster than RF at comparable distance</div><p className="text-slate-500 text-xs mt-2">At 33 million km, DSOC achieved 267 Mbps vs. ~2-25 Mbps for X-band RF systems.</p></div>
                <div className="bg-space-800/50 rounded-xl p-4"><div className="text-slate-300 text-2xl font-bold mb-1">2.6 AU</div><div className="text-slate-400 text-sm">Maximum demonstrated range</div><p className="text-slate-500 text-xs mt-2">390 million km -- nearly 2x the Earth-Sun distance, well beyond Mars distance.</p></div>
                <div className="bg-space-800/50 rounded-xl p-4"><div className="text-slate-300 text-2xl font-bold mb-1">1.58 Tb</div><div className="text-slate-400 text-sm">Total data transmitted</div><p className="text-slate-500 text-xs mt-2">Cumulative data return during the technology demonstration phase in 2024.</p></div>
              </div>
            </div>
          </div>
        )}

        {/* LUNAR COMMS */}
        {commsSubTab === 'lunar' && (
          <div>
            <div className="card-elevated p-6 border border-space-700 mb-6">
              <h3 className="text-white font-semibold text-lg mb-2">Lunar Communications Architecture</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                As humanity returns to the Moon under the Artemis program and commercial lunar missions proliferate,
                the need for a robust lunar communications infrastructure has become critical. Current lunar
                communications rely on direct Earth links via the DSN, which only supports near-side operations
                with line-of-sight to Earth. Far-side coverage, polar region support, and multi-user relay
                services require a dedicated lunar communications constellation -- the vision behind NASA&apos;s
                LunaNet and ESA&apos;s Moonlight initiatives.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-purple-400 text-lg font-bold">1.28 sec</div><div className="text-slate-500 text-xs">One-way light delay</div></div>
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-purple-400 text-lg font-bold">384,400 km</div><div className="text-slate-500 text-xs">Average Earth-Moon distance</div></div>
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-purple-400 text-lg font-bold">~41%</div><div className="text-slate-500 text-xs">Lunar far side (no Earth LOS)</div></div>
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-purple-400 text-lg font-bold">DTN</div><div className="text-slate-500 text-xs">Core protocol (Bundle Protocol)</div></div>
              </div>
            </div>
            <div className="space-y-5 mb-6">{lunarComms.map((element) => (<div key={element.id} className="card-elevated p-6 border border-space-700"><div className="flex items-start justify-between mb-4"><div><h3 className="text-white font-semibold text-lg">{element.name}</h3><span className="text-slate-400 text-sm">{element.agency}</span></div><span className={`text-xs font-bold px-2.5 py-1 rounded border ${element.statusColor}`}>{element.status}</span></div><p className="text-slate-400 text-sm leading-relaxed mb-4">{element.description}</p><div><div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Key Features</div><ul className="space-y-1">{element.keyFeatures.map((feature, i) => (<li key={i} className="text-slate-300 text-sm flex items-start gap-2"><span className="text-purple-400 mt-0.5 flex-shrink-0">-</span>{feature}</li>))}</ul></div></div>))}</div>
            <div className="card-elevated p-6 border border-space-700 mb-6">
              <h3 className="text-white font-semibold mb-4">Artemis Communications Evolution</h3>
              <div className="space-y-3">{[{ phase: 'Artemis I (2022)', comms: 'Direct DSN links via Orion S-band/Ka-band', status: 'Completed', color: 'text-green-400' },{ phase: 'Artemis II (2025)', comms: 'DSN + TDRS relay for crew safety during Earth transit', status: 'Upcoming', color: 'text-slate-300' },{ phase: 'Artemis III (2026)', comms: 'DSN direct + potential Starlink supplement for video relay', status: 'Planned', color: 'text-amber-400' },{ phase: 'Gateway Ops (2027+)', comms: 'Gateway PPE Ka-band relay + proximity S-band to surface', status: 'Development', color: 'text-amber-400' },{ phase: 'LunaNet Era (2030+)', comms: 'Multi-provider relay constellation with DTN networking', status: 'Planned', color: 'text-purple-400' }].map((item, idx) => (<div key={idx} className="flex items-start gap-4 bg-space-800/30 rounded-lg p-4"><div className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-400 mt-2" /><div className="flex-1"><div className="flex items-center gap-3 mb-1"><span className="text-white font-semibold text-sm">{item.phase}</span><span className={`text-xs font-bold ${item.color}`}>{item.status}</span></div><p className="text-slate-400 text-sm">{item.comms}</p></div></div>))}</div>
            </div>
            <div className="card-elevated p-6 border border-purple-500/20">
              <h3 className="text-purple-400 font-semibold mb-4">The Lunar Far-Side Challenge</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">Approximately 41% of the lunar surface (the far side) never faces Earth and cannot communicate directly with ground stations. The lunar South Pole -- the primary Artemis landing target -- has limited and intermittent Earth visibility due to the Moon&apos;s low axial tilt. China&apos;s Queqiao relay satellite (launched 2018) demonstrated far-side relay for the Chang&apos;e 4 lander, marking the first communications relay at a lunar Lagrange point (Earth-Moon L2). A follow-up, Queqiao-2, launched in 2024 to support Chang&apos;e 6 and future missions.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-space-800/50 rounded-xl p-4"><h4 className="text-white font-semibold text-sm mb-2">Near-Side Coverage (Current)</h4><ul className="space-y-1 text-slate-400 text-xs"><li>- Direct DSN links when Earth is above local horizon</li><li>- Limited to ~59% of lunar surface (with libration)</li><li>- Sufficient for Apollo-era style operations</li><li>- No coverage during lunar night for polar sites</li></ul></div><div className="bg-space-800/50 rounded-xl p-4"><h4 className="text-white font-semibold text-sm mb-2">Relay Coverage (Future)</h4><ul className="space-y-1 text-slate-400 text-xs"><li>- Frozen elliptical orbits for polar/far-side coverage</li><li>- 3-5 relay satellites for continuous South Pole service</li><li>- DTN networking for store-and-forward during gaps</li><li>- Optical crosslinks between relay satellites</li></ul></div></div>
            </div>
          </div>
        )}

        {/* STANDARDS */}
        {commsSubTab === 'standards' && (
          <div>
            <div className="card-elevated p-6 border border-space-700 mb-6">
              <h3 className="text-white font-semibold text-lg mb-2">CCSDS: The Standards Body for Space Communications</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                The Consultative Committee for Space Data Systems (CCSDS) is a multinational forum of space agencies
                that develops communications and data systems standards for spaceflight. Founded in 1982, CCSDS
                includes NASA, ESA, JAXA, ROSCOSMOS, CNES, DLR, ASI, UKSA, CSA, ISRO, and KARI as member agencies.
                CCSDS standards ensure interoperability between different agencies&apos; ground and space systems --
                enabling, for example, ESA ground stations to receive data from NASA spacecraft and vice versa.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-green-400 text-lg font-bold">11</div><div className="text-slate-500 text-xs">Member agencies</div></div>
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-green-400 text-lg font-bold">28</div><div className="text-slate-500 text-xs">Observer agencies</div></div>
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-green-400 text-lg font-bold">150+</div><div className="text-slate-500 text-xs">Published standards</div></div>
                <div className="bg-space-800/50 rounded-lg p-3 text-center"><div className="text-green-400 text-lg font-bold">1982</div><div className="text-slate-500 text-xs">Founded</div></div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">{ccsdsProtocols.map((protocol) => (<div key={protocol.abbreviation} className="card-elevated p-6 border border-space-700"><div className="flex items-start justify-between mb-3"><div><h3 className="text-white font-semibold text-lg">{protocol.name}</h3><span className="text-slate-300 text-sm font-mono">{protocol.abbreviation}</span></div><span className="text-xs font-bold px-2.5 py-1 rounded bg-space-800 text-slate-400 border border-space-700">{protocol.layer}</span></div><p className="text-slate-400 text-sm leading-relaxed mb-3">{protocol.description}</p><div><div className="text-slate-500 text-xs uppercase tracking-widest mb-1.5">Used By</div><div className="flex flex-wrap gap-1.5">{protocol.usedBy.map((user) => (<span key={user} className="px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded text-xs">{user}</span>))}</div></div></div>))}</div>
            <div className="card-elevated p-6 border border-space-700 mb-6">
              <h3 className="text-white font-semibold mb-2">Space Communications Frequency Allocations</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">The International Telecommunication Union (ITU) allocates radio frequency spectrum for space services through World Radiocommunication Conferences (WRC). These allocations define which frequencies can be used for space research, Earth exploration, and fixed/mobile satellite services. Optical frequencies are currently unregulated by the ITU, which is one advantage of laser communications.</p>
              <div className="mb-4">
                <div className="text-slate-500 text-xs mb-2">Space Communications Spectrum (Low {String.fromCharCode(8594)} High)</div>
                <div className="flex rounded-lg overflow-hidden h-8">
                  <div className="bg-green-500/30 flex-[1] flex items-center justify-center text-xs text-green-300 font-medium border-r border-space-900">UHF</div>
                  <div className="bg-white/30 flex-[1] flex items-center justify-center text-xs text-slate-200 font-medium border-r border-space-900">S</div>
                  <div className="bg-blue-500/30 flex-[2] flex items-center justify-center text-xs text-blue-300 font-medium border-r border-space-900">X</div>
                  <div className="bg-purple-500/30 flex-[3] flex items-center justify-center text-xs text-purple-300 font-medium border-r border-space-900">Ku</div>
                  <div className="bg-amber-500/30 flex-[6] flex items-center justify-center text-xs text-amber-300 font-medium border-r border-space-900">Ka</div>
                  <div className="bg-red-500/30 flex-[8] flex items-center justify-center text-xs text-red-300 font-medium">Optical</div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-slate-500"><span>390 MHz</span><span>2 GHz</span><span>8 GHz</span><span>18 GHz</span><span>40 GHz</span><span>~200 THz</span></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-space-700"><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Band</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Frequency Range</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">ITU Allocation</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Typical Use</th><th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Max Data Rate</th></tr></thead>
                  <tbody>{frequencyAllocations.map((alloc, idx) => (<tr key={alloc.band} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}><td className={`py-2 px-3 font-bold ${alloc.color}`}>{alloc.band}</td><td className="py-2 px-3 text-white text-xs font-mono">{alloc.range}</td><td className="py-2 px-3 text-slate-300 text-xs">{alloc.allocation}</td><td className="py-2 px-3 text-slate-400 text-xs">{alloc.typicalUse}</td><td className="py-2 px-3 text-amber-400 font-medium">{alloc.maxDataRate}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
            <div className="card-elevated p-6 border border-space-700 mb-6">
              <h3 className="text-white font-semibold mb-2">Signal Latency by Distance</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">Radio waves and laser beams travel at the speed of light (~299,792 km/s). As spacecraft venture further from Earth, communication latency increases proportionally. This latency fundamentally constrains mission operations -- Mars rovers cannot be joystick-driven, and deep space missions require high degrees of autonomy.</p>
              <div className="space-y-3">
                {latencyByOrbit.map((entry) => {
                  const distances: Record<string, number> = { 'LEO (550 km)': 0.0018, 'MEO (8,000 km)': 0.027, 'GEO (35,786 km)': 0.12, 'Lunar (384,400 km)': 1.28, 'Earth-Sun L2 (1.5M km)': 5, 'Mars (avg. 225M km)': 750, 'Jupiter (avg. 778M km)': 2580, 'Voyager 1 (~24.5B km)': 81720 };
                  const maxDist = 81720;
                  const thisDist = distances[entry.orbit] || 1;
                  const logWidth = Math.max((Math.log10(thisDist + 1) / Math.log10(maxDist + 1)) * 100, 2);
                  return (
                    <div key={entry.orbit} className="flex items-center gap-4">
                      <div className="w-44 flex-shrink-0 text-sm text-white font-medium truncate">{entry.orbit}</div>
                      <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden relative">
                        <div className={`h-full rounded transition-all ${entry.color === 'text-green-400' ? 'bg-gradient-to-r from-green-600 to-green-400' : entry.color === 'text-slate-300' ? 'bg-gradient-to-r from-slate-200 to-slate-400' : entry.color === 'text-blue-400' ? 'bg-gradient-to-r from-blue-600 to-blue-400' : entry.color === 'text-purple-400' ? 'bg-gradient-to-r from-purple-600 to-purple-400' : entry.color === 'text-amber-400' ? 'bg-gradient-to-r from-amber-600 to-amber-400' : entry.color === 'text-orange-400' ? 'bg-gradient-to-r from-orange-600 to-orange-400' : entry.color === 'text-red-400' ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-rose-600 to-rose-400'}`} style={{ width: `${logWidth}%` }} />
                        <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-mono">{entry.oneWayLatency}</span>
                      </div>
                      <div className="w-28 flex-shrink-0 text-right text-xs text-slate-400 hidden md:block">RT: {entry.roundTrip}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-slate-500 text-xs mt-3">RT = Round Trip. Logarithmic scale. Actual distances vary by orbital position.</p>
            </div>
            <div className="card-elevated p-6 border border-space-700 mb-6">
              <h3 className="text-white font-semibold mb-2">Link Budget Fundamentals</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">A link budget is the accounting of all gains and losses in a communications link from transmitter to receiver. It determines whether a signal can be successfully received at the required data rate and bit error rate. Every space communications link must close -- meaning the received signal power must exceed the receiver sensitivity by a sufficient margin.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><h4 className="text-green-400 text-xs uppercase tracking-widest mb-3">Signal Gains (+)</h4><div className="space-y-2">{[{ item: 'Transmitter Power (EIRP)', desc: 'RF amplifier output power, typically 5-400W for space' },{ item: 'Transmit Antenna Gain', desc: 'Larger antenna = more focused beam = higher gain (70m DSN ~74 dBi at X-band)' },{ item: 'Receive Antenna Gain', desc: 'Collecting area of the receiving antenna' },{ item: 'Coding Gain', desc: 'Forward error correction (turbo codes, LDPC) add 6-10 dB effective gain' }].map((gain, i) => (<div key={i} className="bg-space-800/30 rounded-lg p-3 flex items-start gap-2"><span className="text-green-400 font-bold text-xs mt-0.5 flex-shrink-0">+</span><div><span className="text-white text-sm font-medium">{gain.item}</span><p className="text-slate-500 text-xs mt-0.5">{gain.desc}</p></div></div>))}</div></div>
                <div><h4 className="text-red-400 text-xs uppercase tracking-widest mb-3">Signal Losses (-)</h4><div className="space-y-2">{[{ item: 'Free Space Path Loss', desc: 'Signal weakens with distance squared. Mars: ~280 dB at X-band' },{ item: 'Atmospheric Attenuation', desc: 'Rain fade (Ka-band), water vapor absorption, cloud blockage (optical)' },{ item: 'Pointing Loss', desc: 'Misalignment between antenna boresight and spacecraft direction' },{ item: 'System Noise Temperature', desc: 'Thermal noise in receiver electronics, cosmic background noise' }].map((loss, i) => (<div key={i} className="bg-space-800/30 rounded-lg p-3 flex items-start gap-2"><span className="text-red-400 font-bold text-xs mt-0.5 flex-shrink-0">-</span><div><span className="text-white text-sm font-medium">{loss.item}</span><p className="text-slate-500 text-xs mt-0.5">{loss.desc}</p></div></div>))}</div></div>
              </div>
            </div>
            <div className="card-elevated p-5 border border-space-700 border-dashed">
              <h3 className="text-sm font-semibold text-white mb-2">Data Sources & References</h3>
              <p className="text-slate-500 text-xs leading-relaxed">Information sourced from NASA/JPL DSN public documentation, CCSDS Blue Books (ccsds.org), ITU Radio Regulations, ESA ESTRACK public materials, NASA LCRD and DSOC mission pages, SDA public acquisition documents, and company press releases. Data rates and specifications are representative of published capabilities and may not reflect real-time operational status.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
