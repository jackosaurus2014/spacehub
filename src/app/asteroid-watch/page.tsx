'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'approaches' | 'known-objects' | 'defense' | 'mining' | 'discovery';

interface CloseApproach {
  id: string;
  name: string;
  date: string;
  distanceLD: number;
  distanceAU: number;
  diameterMin: number;
  diameterMax: number;
  velocity: number;
  torino: number;
  palermo: number;
  isPHA: boolean;
  orbitClass: string;
}

interface SizeCategory {
  label: string;
  range: string;
  known: number;
  estimated: number;
  completeness: number;
  color: string;
}

interface DefenseProgram {
  id: string;
  name: string;
  agency: string;
  status: string;
  statusColor: string;
  description: string;
  keyResults: string[];
  timeline: string;
  link?: string;
}

interface MiningTarget {
  id: string;
  name: string;
  designation: string;
  spectralType: string;
  diameterKm: number;
  deltaV: number;
  estimatedValue: string;
  resources: string[];
  accessibility: string;
  accessColor: string;
  notes: string;
}

interface MiningCompany {
  name: string;
  status: string;
  statusColor: string;
  focus: string;
  funding: string;
  description: string;
}

interface SurveyTelescope {
  name: string;
  operator: string;
  location: string;
  neoDiscoveries: number;
  percentContribution: number;
  status: string;
  statusColor: string;
  description: string;
}

interface DiscoveryMilestone {
  year: number;
  cumulativeNEOs: number;
  cumulativePHAs: number;
  notable: string;
}

interface ImpactRiskObject {
  des: string;
  fullname: string;
  ip: string;
  ps_cum: string;
  ps_max: string;
  v_inf: string;
  last_obs: string;
  n_imp: string;
  range: string;
  ts_max: string;
  diameter: string;
}

interface FireballEvent {
  date: string;
  energy: string;
  impact_e: string;
  lat: string;
  lon: string;
  alt: string;
  vel: string;
}

// ────────────────────────────────────────
// Data is fetched from /api/content/asteroid-watch
// ────────────────────────────────────────

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function getTorinoColor(scale: number): { bg: string; text: string; border: string; label: string } {
  if (scale === 0) return { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500', label: 'No Hazard' };
  if (scale === 1) return { bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-400', label: 'Normal' };
  if (scale >= 2 && scale <= 4) return { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500', label: 'Meriting Attention' };
  if (scale >= 5 && scale <= 7) return { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500', label: 'Threatening' };
  return { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500', label: 'Certain Collision' };
}

function formatDiameter(min: number, max: number): string {
  if (min === max) return `${min} m`;
  return `${min} - ${max} m`;
}

function getDistanceColor(ld: number): string {
  if (ld <= 1) return 'text-red-400';
  if (ld <= 5) return 'text-orange-400';
  if (ld <= 10) return 'text-yellow-400';
  return 'text-slate-300';
}

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

function ApproachCard({ approach }: { approach: CloseApproach }) {
  const torino = getTorinoColor(approach.torino);
  const approachDate = new Date(approach.date);
  const now = new Date();
  const daysUntil = Math.ceil((approachDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isPast = daysUntil < 0;

  return (
    <div className={`card p-5 border ${approach.torino >= 2 ? torino.border : 'border-slate-700/50'} ${approach.torino >= 2 ? torino.bg : ''}`}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="font-semibold text-white text-lg">{approach.name}</h4>
            {approach.isPHA && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-500/50">
                PHA
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${torino.bg} ${torino.text} border ${torino.border}`}>
              Torino {approach.torino}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
              {approach.orbitClass}
            </span>
            {isPast && (
              <span className="text-xs bg-slate-700/50 text-slate-500 px-2 py-0.5 rounded">Past</span>
            )}
          </div>
          <div className="text-slate-400 text-sm">
            {approachDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            <span className="text-slate-500 ml-2">
              ({isPast ? `${Math.abs(daysUntil)}d ago` : daysUntil === 0 ? 'Today' : `in ${daysUntil}d`})
            </span>
          </div>
        </div>

        <div className="text-right flex-shrink-0 space-y-1">
          <div className="text-sm">
            <span className="text-slate-400">Distance: </span>
            <span className={`font-bold ${getDistanceColor(approach.distanceLD)}`}>
              {approach.distanceLD.toFixed(1)} LD
            </span>
            <span className="text-slate-500 text-xs ml-1">({approach.distanceAU.toFixed(4)} AU)</span>
          </div>
          <div className="text-sm">
            <span className="text-slate-400">Velocity: </span>
            <span className="text-white font-medium">{approach.velocity.toFixed(1)} km/s</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-700/50 text-xs">
        <span className="text-slate-400">
          Diameter: <span className="text-slate-300 font-medium">{formatDiameter(approach.diameterMin, approach.diameterMax)}</span>
        </span>
        <span className="text-slate-400">
          Palermo: <span className={`font-medium ${approach.palermo > -2 ? 'text-yellow-400' : 'text-slate-500'}`}>
            {approach.palermo <= -10 ? '< -10' : approach.palermo.toFixed(1)}
          </span>
        </span>
        {approach.torino >= 2 && (
          <span className={`font-medium ${torino.text}`}>
            {torino.label}
          </span>
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label, subValue, valueColor }: { value: string; label: string; subValue?: string; valueColor?: string }) {
  return (
    <div className="card-elevated p-4 text-center">
      <div className={`text-2xl font-bold font-display ${valueColor || 'text-white'}`}>
        {value}
      </div>
      <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
        {label}
      </div>
      {subValue && (
        <div className="text-slate-500 text-[10px] mt-0.5">{subValue}</div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Main Content
// ────────────────────────────────────────

function AsteroidWatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = (searchParams.get('tab') as TabId) || 'approaches';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // API-fetched data
  const [CLOSE_APPROACHES, setCloseApproaches] = useState<CloseApproach[]>([]);
  const [NEO_STATS, setNeoStats] = useState<any>({ totalNEOs: 0, totalPHAs: 0, totalNEAs: 0, totalNECs: 0, last30DaysDiscoveries: 0, lastYearDiscoveries: 0, largestNEA: { name: '', diameter: 0 }, closestApproach2025: { name: '', distance: '' } });
  const [SIZE_CATEGORIES, setSizeCategories] = useState<SizeCategory[]>([]);
  const [SPECTRAL_DISTRIBUTION, setSpectralDistribution] = useState<any[]>([]);
  const [DEFENSE_PROGRAMS, setDefensePrograms] = useState<DefenseProgram[]>([]);
  const [MINING_TARGETS, setMiningTargets] = useState<MiningTarget[]>([]);
  const [MINING_COMPANIES, setMiningCompanies] = useState<MiningCompany[]>([]);
  const [SURVEY_TELESCOPES, setSurveyTelescopes] = useState<SurveyTelescope[]>([]);
  const [DISCOVERY_MILESTONES, setDiscoveryMilestones] = useState<DiscoveryMilestone[]>([]);
  const [IMPACT_RISK_OBJECTS, setImpactRiskObjects] = useState<ImpactRiskObject[]>([]);
  const [FIREBALL_EVENTS, setFireballEvents] = useState<FireballEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setError(null);
      try {
        const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11] = await Promise.all([
          fetch('/api/content/asteroid-watch?section=close-approaches'),
          fetch('/api/content/asteroid-watch?section=neo-stats'),
          fetch('/api/content/asteroid-watch?section=size-categories'),
          fetch('/api/content/asteroid-watch?section=spectral-distribution'),
          fetch('/api/content/asteroid-watch?section=defense-programs'),
          fetch('/api/content/asteroid-watch?section=mining-targets'),
          fetch('/api/content/asteroid-watch?section=mining-companies'),
          fetch('/api/content/asteroid-watch?section=survey-telescopes'),
          fetch('/api/content/asteroid-watch?section=discovery-milestones'),
          fetch('/api/content/asteroid-watch?section=impact-risk'),
          fetch('/api/content/asteroid-watch?section=fireballs'),
        ]);
        const [d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11] = await Promise.all([
          r1.json(), r2.json(), r3.json(), r4.json(), r5.json(), r6.json(), r7.json(), r8.json(), r9.json(), r10.json(), r11.json(),
        ]);
        setCloseApproaches(d1.data || []);
        if (d2.data?.[0]) setNeoStats(d2.data[0]);
        setSizeCategories(d3.data || []);
        setSpectralDistribution(d4.data || []);
        setDefensePrograms(d5.data || []);
        setMiningTargets(d6.data || []);
        setMiningCompanies(d7.data || []);
        setSurveyTelescopes(d8.data || []);
        setDiscoveryMilestones(d9.data || []);
        setImpactRiskObjects(d10.data || []);
        setFireballEvents(d11.data || []);
        setRefreshedAt(d1.meta?.lastRefreshed || null);
      } catch (error) {
        console.error('Failed to load asteroid watch data:', error);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'approaches') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'approaches', label: 'Close Approaches' },
    { id: 'known-objects', label: 'Known Objects' },
    { id: 'defense', label: 'Planetary Defense' },
    { id: 'mining', label: 'Mining Targets' },
    { id: 'discovery', label: 'Discovery' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sortedApproaches = [...CLOSE_APPROACHES].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  const phaCount = CLOSE_APPROACHES.filter(a => a.isPHA).length;
  const closestApproach = [...CLOSE_APPROACHES].sort((a, b) => a.distanceLD - b.distanceLD)[0];
  const highestTorino = [...CLOSE_APPROACHES].sort((a, b) => b.torino - a.torino)[0];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Asteroid Watch"
          subtitle="Near-Earth object tracking, planetary defense intelligence, and asteroid mining prospects"
          icon="☄️"
          accentColor="amber"
        />

        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" className="mb-4" />

        {error && !loading && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard value={NEO_STATS.totalNEOs.toLocaleString()} label="Known NEOs" subValue={`+${NEO_STATS.last30DaysDiscoveries} last 30d`} />
          <StatCard value={NEO_STATS.totalPHAs.toLocaleString()} label="Known PHAs" valueColor="text-orange-400" />
          <StatCard value={`${CLOSE_APPROACHES.length}`} label="Tracked Approaches" />
          <StatCard value={`${phaCount}`} label="PHAs in List" valueColor={phaCount > 0 ? 'text-red-400' : 'text-green-400'} />
          <StatCard value={closestApproach ? `${closestApproach.distanceLD.toFixed(1)} LD` : 'N/A'} label="Closest Pass" valueColor={getDistanceColor(closestApproach?.distanceLD || 99)} />
          <StatCard
            value={`${highestTorino?.torino || 0}`}
            label="Highest Torino"
            valueColor={highestTorino?.torino >= 2 ? 'text-yellow-400' : 'text-green-400'}
            subValue={highestTorino?.name}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ──────────────── CLOSE APPROACHES TAB ──────────────── */}
        {activeTab === 'approaches' && (
          <div className="space-y-4">
            {/* Torino Scale Legend */}
            <div className="card p-4 mb-2">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-slate-400 font-medium">Torino Scale:</span>
                {[
                  { range: '0', label: 'No Hazard', color: 'bg-green-500' },
                  { range: '1', label: 'Normal', color: 'bg-green-400' },
                  { range: '2-4', label: 'Meriting Attention', color: 'bg-yellow-500' },
                  { range: '5-7', label: 'Threatening', color: 'bg-orange-500' },
                  { range: '8-10', label: 'Certain Collision', color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.range} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${item.color}`} />
                    <span className="text-slate-400">{item.range}: {item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Approach Cards */}
            {sortedApproaches.map((approach) => (
              <ApproachCard key={approach.id} approach={approach} />
            ))}

            {/* Key Upcoming Events Highlight */}
            <div className="card p-6 border border-nebula-500/30 bg-nebula-500/5 mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Key Upcoming Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-nebula-300 font-semibold mb-1">Apophis Close Approach</div>
                  <div className="text-slate-400 text-sm">April 13, 2029</div>
                  <p className="text-slate-400 text-sm mt-2">
                    99942 Apophis will pass within 31,600 km of Earth -- closer than geostationary satellites.
                    Visible to the naked eye from parts of the Eastern Hemisphere. No impact risk (Torino 0),
                    but the closest approach of an asteroid this large in recorded history.
                  </p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-nebula-300 font-semibold mb-1">Bennu Close Approach</div>
                  <div className="text-slate-400 text-sm">September 25, 2060</div>
                  <p className="text-slate-400 text-sm mt-2">
                    101955 Bennu will make a very close approach to Earth. While cumulative impact
                    probability through 2300 is ~1/2,700, the OSIRIS-REx mission refined its orbit
                    to high precision. Bennu remains the best-characterized PHA.
                  </p>
                </div>
              </div>
            </div>

            {/* Impact Risk Assessment */}
            {IMPACT_RISK_OBJECTS.length > 0 && (
              <div className="card p-6 mt-6">
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-red-400">&#9888;</span> Impact Risk Assessment
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Objects with non-zero impact probability tracked by NASA/JPL Sentry system. Most risks are extremely small and decrease with additional observations.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-700">
                        <th className="pb-3 pr-4">Object</th>
                        <th className="pb-3 pr-4">Diameter</th>
                        <th className="pb-3 pr-4 text-right">Impact Prob.</th>
                        <th className="pb-3 pr-4 text-right">Torino Max</th>
                        <th className="pb-3 pr-4 text-right">Palermo Cum.</th>
                        <th className="pb-3 pr-4">Potential Impacts</th>
                        <th className="pb-3">Last Observed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {IMPACT_RISK_OBJECTS.map((obj) => {
                        const torinoVal = parseInt(obj.ts_max) || 0;
                        const torinoStyle = getTorinoColor(torinoVal);
                        return (
                          <tr key={obj.des} className="border-b border-slate-800">
                            <td className="py-2.5 pr-4">
                              <div className="text-white font-medium">{obj.fullname || obj.des}</div>
                              <div className="text-slate-500 text-xs">{obj.range}</div>
                            </td>
                            <td className="py-2.5 pr-4 text-slate-300">{obj.diameter || '--'}</td>
                            <td className="py-2.5 pr-4 text-right">
                              <span className={`font-medium ${parseFloat(obj.ip) > 0.01 ? 'text-red-400' : parseFloat(obj.ip) > 0.001 ? 'text-yellow-400' : 'text-slate-300'}`}>
                                {obj.ip}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-right">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${torinoStyle.bg} ${torinoStyle.text} border ${torinoStyle.border}`}>
                                {obj.ts_max}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-right">
                              <span className={`font-medium ${parseFloat(obj.ps_cum) > -2 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                {obj.ps_cum}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-slate-400">{obj.n_imp}</td>
                            <td className="py-2.5 text-slate-400 text-xs">{obj.last_obs}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-500 text-xs mt-4 italic">
                  Data from NASA/JPL Sentry impact monitoring system. Impact probabilities are cumulative over all potential impact dates.
                </p>
              </div>
            )}

            {/* Recent Fireball Events */}
            {FIREBALL_EVENTS.length > 0 && (
              <div className="card p-6 mt-6">
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-orange-400">&#9728;</span> Recent Fireball Events
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Bright meteors (fireballs) detected by U.S. Government sensors entering Earth&apos;s atmosphere.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FIREBALL_EVENTS.map((fb, idx) => (
                    <div key={idx} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-orange-500/30 transition-all">
                      <div className="text-white font-medium text-sm mb-2">{fb.date}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {fb.lat && fb.lon && (
                          <div>
                            <span className="text-slate-500 block">Location</span>
                            <span className="text-slate-300">{fb.lat}, {fb.lon}</span>
                          </div>
                        )}
                        {fb.vel && (
                          <div>
                            <span className="text-slate-500 block">Velocity</span>
                            <span className="text-slate-300">{fb.vel} km/s</span>
                          </div>
                        )}
                        {fb.alt && (
                          <div>
                            <span className="text-slate-500 block">Altitude</span>
                            <span className="text-slate-300">{fb.alt} km</span>
                          </div>
                        )}
                        {fb.energy && (
                          <div>
                            <span className="text-slate-500 block">Radiated Energy</span>
                            <span className="text-orange-400 font-medium">{fb.energy} J</span>
                          </div>
                        )}
                        {fb.impact_e && (
                          <div>
                            <span className="text-slate-500 block">Impact Energy</span>
                            <span className="text-red-400 font-medium">{fb.impact_e} kt</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {FIREBALL_EVENTS.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-8">No recent fireball events available.</p>
                )}
                <p className="text-slate-500 text-xs mt-4 italic">
                  Data from NASA/JPL Center for NEO Studies (CNEOS) fireball database. Energy in joules (radiated) and kilotons TNT equivalent (impact).
                </p>
              </div>
            )}

            {/* Data source note */}
            <ScrollReveal><div className="card p-4 border-dashed text-sm text-slate-500">
              Close approach data sourced from NASA Center for Near-Earth Object Studies (CNEOS) and
              JPL Small-Body Database. Distances in LD (Lunar Distances, 1 LD = 384,400 km) and AU
              (Astronomical Units, 1 AU = 149,597,871 km). Torino Scale ratings reflect current
              impact probability assessments.
            </div></ScrollReveal>
          </div>
        )}

        {/* ──────────────── KNOWN OBJECTS TAB ──────────────── */}
        {activeTab === 'known-objects' && (
          <div className="space-y-6">
            {/* NEO Census Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold font-display text-white">{NEO_STATS.totalNEAs.toLocaleString()}</div>
                <div className="text-slate-400 text-sm mt-1">Near-Earth Asteroids</div>
                <div className="text-slate-500 text-xs mt-0.5">Including all orbital classes</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold font-display text-white">{NEO_STATS.totalNECs.toLocaleString()}</div>
                <div className="text-slate-400 text-sm mt-1">Near-Earth Comets</div>
                <div className="text-slate-500 text-xs mt-0.5">Periodic and long-period</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold font-display text-orange-400">{NEO_STATS.totalPHAs.toLocaleString()}</div>
                <div className="text-slate-400 text-sm mt-1">Potentially Hazardous</div>
                <div className="text-slate-500 text-xs mt-0.5">MOID &lt; 0.05 AU, H &lt; 22</div>
              </div>
              <div className="card p-5 text-center">
                <div className="text-3xl font-bold font-display text-nebula-300">{NEO_STATS.lastYearDiscoveries.toLocaleString()}</div>
                <div className="text-slate-400 text-sm mt-1">Discovered Last Year</div>
                <div className="text-slate-500 text-xs mt-0.5">~{Math.round(NEO_STATS.lastYearDiscoveries / 12)} per month average</div>
              </div>
            </div>

            {/* Discovery Completeness by Size */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Discovery Completeness by Size</h3>
              <p className="text-slate-400 text-sm mb-6">
                Estimated percentage of existing NEOs discovered for each size category. Larger objects are nearly
                fully cataloged, while small objects remain mostly undiscovered.
              </p>
              <div className="space-y-5">
                {SIZE_CATEGORIES.map((cat) => (
                  <div key={cat.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-white font-medium">{cat.label}</span>
                        <span className="text-slate-500 text-xs ml-2">{cat.range}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-300 text-sm font-medium">
                          {cat.known.toLocaleString()} found
                        </span>
                        <span className="text-slate-500 text-xs ml-2">
                          / ~{cat.estimated.toLocaleString()} est.
                        </span>
                      </div>
                    </div>
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${cat.color} rounded-full transition-all`}
                        style={{ width: `${Math.min(cat.completeness, 100)}%` }}
                      />
                    </div>
                    <div className="text-right mt-0.5">
                      <span className={`text-xs font-medium ${cat.completeness >= 80 ? 'text-green-400' : cat.completeness >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {cat.completeness >= 1 ? `${cat.completeness}%` : `${cat.completeness}%`} complete
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spectral Type Distribution */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Spectral Type Distribution</h3>
              <p className="text-slate-400 text-sm mb-6">
                Classification of known NEOs by spectral type, indicating composition and surface properties.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SPECTRAL_DISTRIBUTION.map((spec) => (
                  <div key={spec.type} className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">{spec.type}</span>
                      <span className="text-slate-300 font-bold">{spec.percentage}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full bg-gradient-to-r ${spec.color} rounded-full`}
                        style={{ width: `${spec.percentage * 2.5}%` }}
                      />
                    </div>
                    <div className="text-slate-400 text-xs">{spec.description}</div>
                    <div className="text-slate-500 text-xs mt-1">~{spec.count.toLocaleString()} objects</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orbital Class Distribution */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">NEO Orbital Classifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Apollo', count: 18_940, description: 'Earth-crossing, semi-major axis > 1 AU. Largest class of NEOs.', color: 'text-red-400', percentage: 53 },
                  { name: 'Amor', count: 11_280, description: 'Earth-approaching, orbits exterior to Earth. Do not cross Earth orbit.', color: 'text-orange-400', percentage: 32 },
                  { name: 'Aten', count: 4_840, description: 'Earth-crossing, semi-major axis < 1 AU. Spend most time inside Earth orbit.', color: 'text-yellow-400', percentage: 14 },
                  { name: 'Atira', count: 412, description: 'Orbit entirely interior to Earth orbit. Hardest to detect from ground.', color: 'text-cyan-400', percentage: 1 },
                ].map((cls) => (
                  <div key={cls.name} className="card p-4 bg-slate-800/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-lg font-bold ${cls.color}`}>{cls.name}</span>
                      <span className="text-white font-display text-lg">{cls.count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-gradient-to-r from-nebula-500 to-plasma-400 rounded-full" style={{ width: `${cls.percentage}%` }} />
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{cls.description}</p>
                    <div className="text-slate-500 text-xs mt-1">{cls.percentage}% of NEOs</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cumulative Discovery Timeline */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Cumulative Discovery Timeline</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-700">
                      <th className="pb-3 pr-4">Year</th>
                      <th className="pb-3 pr-4 text-right">Total NEOs</th>
                      <th className="pb-3 pr-4 text-right">Total PHAs</th>
                      <th className="pb-3">Notable Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DISCOVERY_MILESTONES.map((milestone) => (
                      <tr key={milestone.year} className="border-b border-slate-800">
                        <td className="py-2.5 pr-4 text-white font-medium">{milestone.year}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-300">{milestone.cumulativeNEOs.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right text-orange-400">{milestone.cumulativePHAs.toLocaleString()}</td>
                        <td className="py-2.5 text-slate-400 text-xs">{milestone.notable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Visual bar representation */}
              <div className="mt-6 pt-4 border-t border-slate-700">
                <h4 className="text-sm font-medium text-slate-400 mb-3">Discovery Growth</h4>
                <div className="flex items-end gap-1 h-32">
                  {DISCOVERY_MILESTONES.map((m) => {
                    const maxNEO = DISCOVERY_MILESTONES[DISCOVERY_MILESTONES.length - 1].cumulativeNEOs;
                    const heightPct = (m.cumulativeNEOs / maxNEO) * 100;
                    return (
                      <div key={m.year} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-gradient-to-t from-nebula-500 to-plasma-400 rounded-t transition-all group-hover:opacity-80"
                          style={{ height: `${heightPct}%`, minHeight: '2px' }}
                        />
                        <span className="text-[9px] text-slate-500 rotate-[-45deg] origin-center whitespace-nowrap">{m.year}</span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs whitespace-nowrap shadow-xl">
                            <div className="text-white font-medium">{m.year}</div>
                            <div className="text-slate-400">{m.cumulativeNEOs.toLocaleString()} NEOs</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── PLANETARY DEFENSE TAB ──────────────── */}
        {activeTab === 'defense' && (
          <div className="space-y-6">
            {/* DART Impact Banner */}
            <div className="card p-6 border-2 border-green-500/30 bg-green-900/10">
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">&#127775;</div>
                <div>
                  <h3 className="text-xl font-bold text-green-400 mb-2">DART Mission: Planetary Defense Validated</h3>
                  <p className="text-slate-300">
                    On September 26, 2022, NASA&apos;s DART spacecraft successfully impacted Dimorphos at 6.1 km/s,
                    changing its orbital period by <span className="text-green-400 font-bold">33 minutes</span> (from 11h 55m to 11h 22m).
                    This far exceeded the minimum 73-second benchmark and confirmed kinetic impactor technology
                    as a viable method to deflect an asteroid on a collision course with Earth.
                  </p>
                </div>
              </div>
            </div>

            {/* Defense Programs */}
            <div className="space-y-4">
              {DEFENSE_PROGRAMS.map((program) => (
                <div key={program.id} className="card p-6">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{program.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-slate-400 text-sm">{program.agency}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded bg-slate-800 ${program.statusColor}`}>
                          {program.status}
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-500 text-xs">{program.timeline}</span>
                  </div>

                  <p className="text-slate-400 text-sm mb-4">{program.description}</p>

                  <div className="space-y-1.5">
                    <h4 className="text-slate-300 text-sm font-medium">Key Results & Facts</h4>
                    <ul className="space-y-1">
                      {program.keyResults.map((result, idx) => (
                        <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                          <span className="text-nebula-400 mt-1 flex-shrink-0">&#9656;</span>
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Deflection Methods Overview */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Deflection Technology Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Kinetic Impactor', readiness: 'Flight-Proven (DART)', readinessColor: 'text-green-400', description: 'High-speed spacecraft collision to change asteroid velocity. Most mature technology. Effectiveness depends on target composition and impact geometry.', effectiveness: 'Best for small-medium asteroids with years of warning.' },
                  { name: 'Gravity Tractor', readiness: 'Conceptual', readinessColor: 'text-yellow-400', description: 'Spacecraft hovers near asteroid, using gravitational attraction to slowly alter its orbit. Requires no physical contact but needs long lead time.', effectiveness: 'Best for precise, gentle deflection over decades.' },
                  { name: 'Nuclear Standoff', readiness: 'Theoretical', readinessColor: 'text-orange-400', description: 'Detonation of nuclear device near asteroid surface to vaporize material and create deflection thrust. Only option for large, late-detected threats.', effectiveness: 'Last resort for large objects with short warning time.' },
                  { name: 'Ion Beam Deflection', readiness: 'Conceptual', readinessColor: 'text-yellow-400', description: 'Direct ion thruster exhaust at asteroid surface to impart momentum. Spacecraft maintains position with second thruster.', effectiveness: 'Efficient for slow, sustained deflection campaigns.' },
                  { name: 'Laser Ablation', readiness: 'Laboratory', readinessColor: 'text-orange-400', description: 'Focused laser beam vaporizes asteroid surface material, creating a jet of ejecta that pushes the asteroid. Could operate from orbit.', effectiveness: 'Promising for continuous, controlled deflection.' },
                  { name: 'Mass Driver', readiness: 'Conceptual', readinessColor: 'text-yellow-400', description: 'Robotic device lands on asteroid and uses electromagnetic launcher to eject surface material, producing reaction force.', effectiveness: 'Self-sustaining using asteroid material as propellant.' },
                ].map((method) => (
                  <div key={method.name} className="p-4 bg-slate-800/30 rounded-lg">
                    <h4 className="text-white font-medium mb-1">{method.name}</h4>
                    <span className={`text-xs ${method.readinessColor}`}>{method.readiness}</span>
                    <p className="text-slate-400 text-xs mt-2 leading-relaxed">{method.description}</p>
                    <p className="text-slate-500 text-xs mt-2 italic">{method.effectiveness}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Related modules */}
            <ScrollReveal><div className="card p-5">
              <h3 className="text-lg font-semibold text-white mb-3">Related Modules</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href="/debris-monitor" className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 transition-colors group">
                  <div className="text-sm font-medium text-white group-hover:text-nebula-300">Debris Monitor</div>
                  <p className="text-xs text-slate-400 mt-1">Impact debris and conjunction tracking</p>
                </Link>
                <Link href="/solar-exploration" className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 transition-colors group">
                  <div className="text-sm font-medium text-white group-hover:text-nebula-300">Solar Exploration</div>
                  <p className="text-xs text-slate-400 mt-1">Planetary missions and surface landers</p>
                </Link>
                <Link href="/space-mining" className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-700/50 transition-colors group">
                  <div className="text-sm font-medium text-white group-hover:text-nebula-300">Space Mining</div>
                  <p className="text-xs text-slate-400 mt-1">Asteroid mining intelligence</p>
                </Link>
              </div>
            </div></ScrollReveal>
          </div>
        )}

        {/* ──────────────── MINING TARGETS TAB ──────────────── */}
        {activeTab === 'mining' && (
          <div className="space-y-6">
            {/* Mining Targets */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Highest-Value Asteroid Targets</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {MINING_TARGETS.map((target) => (
                  <div key={target.id} className="card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-semibold text-lg">{target.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-500 text-xs">Designation: {target.designation}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {target.spectralType}
                          </span>
                          <span className={`text-xs font-medium ${target.accessColor}`}>
                            {target.accessibility}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-nebula-300 font-bold text-sm">{target.estimatedValue}</div>
                        <div className="text-slate-500 text-xs">Est. Value</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <span className="text-slate-500 block">Diameter</span>
                        <span className="text-slate-300 font-medium">{target.diameterKm} km</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Delta-V</span>
                        <span className="text-slate-300 font-medium">{target.deltaV} km/s</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-slate-500 text-xs block mb-1">Key Resources</span>
                      <div className="flex flex-wrap gap-1">
                        {target.resources.map((resource) => (
                          <span key={resource} className="text-xs px-2 py-0.5 rounded bg-slate-800/80 text-slate-400">
                            {resource}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-slate-500 text-xs leading-relaxed">{target.notes}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mining Companies */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Asteroid Mining Companies</h3>
              <div className="space-y-4">
                {MINING_COMPANIES.map((company) => (
                  <div key={company.name} className="p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                      <div>
                        <h4 className="text-white font-medium">{company.name}</h4>
                        <span className="text-slate-400 text-xs">{company.focus}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium ${company.statusColor}`}>{company.status}</span>
                        <div className="text-slate-500 text-xs">{company.funding}</div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm">{company.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delta-V Accessibility Note */}
            <div className="card p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-3">Understanding Delta-V & Accessibility</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">What is Delta-V?</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Delta-V (change in velocity) measures the energy needed to reach an asteroid from Earth orbit.
                    Lower delta-v means less fuel and lower mission cost. Some NEOs require less delta-v to reach
                    than the Moon (which needs ~6.3 km/s from LEO), making them more accessible for mining operations.
                  </p>
                </div>
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Accessibility Rankings</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-medium">Accessible:</span>
                      <span className="text-slate-400">&lt; 5.5 km/s delta-v, favorable windows</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-medium">Challenging:</span>
                      <span className="text-slate-400">5.5 - 7.0 km/s, less frequent windows</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 font-medium">Difficult:</span>
                      <span className="text-slate-400">&gt; 7.0 km/s, main belt or high inclination</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cross-link to Space Mining module */}
            <div className="card p-4 flex items-center justify-between">
              <div>
                <span className="text-white font-medium text-sm">Want comprehensive mining intelligence?</span>
                <p className="text-slate-400 text-xs mt-1">Full commodity pricing, resource exchange, and economic analysis</p>
              </div>
              <Link
                href="/space-mining"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30 whitespace-nowrap"
              >
                Space Mining Hub &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* ──────────────── DISCOVERY TAB ──────────────── */}
        {activeTab === 'discovery' && (
          <div className="space-y-6">
            {/* Survey Telescope Contributions */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-2">Survey Telescope Contributions</h3>
              <p className="text-slate-400 text-sm mb-6">
                NEO discovery credits by major survey telescope programs. Numbers represent confirmed NEO discoveries attributed to each survey.
              </p>
              <div className="space-y-4">
                {[...SURVEY_TELESCOPES]
                  .sort((a, b) => b.neoDiscoveries - a.neoDiscoveries)
                  .map((telescope) => {
                    const maxDiscoveries = SURVEY_TELESCOPES.reduce((max, t) => Math.max(max, t.neoDiscoveries), 0);
                    const widthPct = maxDiscoveries > 0 ? (telescope.neoDiscoveries / maxDiscoveries) * 100 : 0;

                    return (
                      <div key={telescope.name} className="p-4 bg-slate-800/30 rounded-lg">
                        <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                          <div>
                            <h4 className="text-white font-medium">{telescope.name}</h4>
                            <span className="text-slate-500 text-xs">{telescope.operator}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-medium ${telescope.statusColor}`}>{telescope.status}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-nebula-500 to-plasma-400 rounded-full"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <span className="text-white font-bold text-sm w-20 text-right">
                            {telescope.neoDiscoveries > 0 ? telescope.neoDiscoveries.toLocaleString() : 'N/A'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{telescope.location}</span>
                          <span className="text-slate-400">
                            {telescope.percentContribution > 0 ? `${telescope.percentContribution}% of all NEOs` : 'Survey beginning'}
                          </span>
                        </div>

                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">{telescope.description}</p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Vera Rubin Observatory Highlight */}
            <div className="card p-6 border-2 border-blue-500/30 bg-blue-900/10">
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">&#128301;</div>
                <div>
                  <h3 className="text-xl font-bold text-blue-400 mb-2">Vera C. Rubin Observatory: A Revolution in NEO Discovery</h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    The Vera C. Rubin Observatory (formerly LSST) on Cerro Pachon, Chile, achieved first light in 2025
                    and is beginning its 10-year Legacy Survey of Space and Time. Its 8.4-meter primary mirror and
                    3.2-gigapixel camera will survey the entire visible sky every few nights, fundamentally
                    transforming NEO detection capabilities.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-slate-800/40 rounded-lg">
                      <div className="text-blue-400 font-bold text-xl">~5M</div>
                      <div className="text-slate-400 text-xs">Predicted NEO detections over survey lifetime</div>
                    </div>
                    <div className="p-3 bg-slate-800/40 rounded-lg">
                      <div className="text-blue-400 font-bold text-xl">60-70%</div>
                      <div className="text-slate-400 text-xs">Expected to find this share of remaining 140m+ NEOs</div>
                    </div>
                    <div className="p-3 bg-slate-800/40 rounded-lg">
                      <div className="text-blue-400 font-bold text-xl">Every 3 nights</div>
                      <div className="text-slate-400 text-xs">Full southern sky cadence</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Discovery Rate Trends */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Discovery Rate Trends</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-slate-800/30 rounded-lg text-center">
                  <div className="text-3xl font-bold font-display text-white">~260</div>
                  <div className="text-slate-400 text-sm">NEOs per month (2025)</div>
                  <div className="text-slate-500 text-xs mt-1">Up from ~150/month in 2020</div>
                </div>
                <div className="p-4 bg-slate-800/30 rounded-lg text-center">
                  <div className="text-3xl font-bold font-display text-white">~10</div>
                  <div className="text-slate-400 text-sm">PHAs per month (average)</div>
                  <div className="text-slate-500 text-xs mt-1">Rate increasing with survey capability</div>
                </div>
                <div className="p-4 bg-slate-800/30 rounded-lg text-center">
                  <div className="text-3xl font-bold font-display text-white">2</div>
                  <div className="text-slate-400 text-sm">Pre-impact detections to date</div>
                  <div className="text-slate-500 text-xs mt-1">2008 TC3, 2024 BX1</div>
                </div>
              </div>

              <h4 className="text-slate-300 font-medium mb-3">Notable Recent Discoveries</h4>
              <div className="space-y-2">
                {[
                  { date: '2024', name: '2024 YR4', note: 'Initially rated Torino 3 -- highest rating for any object in years. Further observations will refine orbit and likely reduce risk.' },
                  { date: '2024', name: '2024 BX1', note: 'Detected by ATLAS just hours before impact. Third object ever detected before atmospheric entry. Harmless 1-meter object over Germany.' },
                  { date: '2023', name: '2023 CX1', note: 'Detected ~7 hours before impact over English Channel. Demonstrates improving early warning capability.' },
                  { date: '2020', name: '2020 CD3', note: 'Second known temporarily captured natural satellite (mini-moon) of Earth, discovered by Catalina Sky Survey.' },
                  { date: '2019', name: '2019 OK', note: '~100m asteroid passed within 0.19 LD -- discovered only hours before closest approach. Highlighted gaps in detection.' },
                  { date: '2017', name: 'Oumuamua (1I/2017 U1)', note: 'First known interstellar object to pass through our solar system. Discovered by Pan-STARRS.' },
                ].map((discovery, idx) => (
                  <div key={idx} className="p-3 bg-slate-800/20 rounded-lg flex items-start gap-3">
                    <span className="text-nebula-400 text-xs font-mono font-medium mt-0.5 flex-shrink-0 w-10">{discovery.date}</span>
                    <div>
                      <span className="text-white font-medium text-sm">{discovery.name}</span>
                      <p className="text-slate-400 text-xs mt-0.5">{discovery.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detection Capabilities */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Detection Capabilities & Gaps</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-slate-300 font-medium mb-3">Current Strengths</h4>
                  <ul className="space-y-2">
                    {[
                      '93% of 1km+ NEOs are cataloged -- any civilization-ending impactor is likely known',
                      'All-sky coverage with ATLAS providing 24-hour cadence for bright objects',
                      'Proven ability to detect objects hours before atmospheric entry',
                      'Infrared characterization has measured sizes of 1,850+ NEOs',
                      'International cooperation through IAWN ensures global coverage',
                    ].map((item, idx) => (
                      <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                        <span className="text-green-400 mt-0.5 flex-shrink-0">&#9632;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-slate-300 font-medium mb-3">Remaining Gaps</h4>
                  <ul className="space-y-2">
                    {[
                      'Only ~43% of 140m+ NEOs found (Congress mandated 90% by George E. Brown Jr. Act)',
                      'Less than 3% of 40-140m "city killer" asteroids are cataloged',
                      'Sun-approaching objects (Atira class) are extremely difficult to detect from ground',
                      'No space-based dedicated NEO survey until NEO Surveyor launches (2028)',
                      'Southern hemisphere coverage historically weaker (improving with Rubin, ATLAS South)',
                    ].map((item, idx) => (
                      <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                        <span className="text-red-400 mt-0.5 flex-shrink-0">&#9632;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <div className="card p-5 border-dashed">
              <h3 className="text-lg font-semibold text-white mb-3">Data Sources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Discovery Data</h4>
                  <ul className="space-y-1">
                    <li>NASA/JPL Center for Near-Earth Object Studies (CNEOS)</li>
                    <li>Minor Planet Center (MPC) discovery statistics</li>
                    <li>ESA NEO Coordination Centre (NEOCC)</li>
                    <li>Individual survey program publications</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Characterization</h4>
                  <ul className="space-y-1">
                    <li>NEOWISE thermal model diameters and albedos</li>
                    <li>SMASS spectral classification survey</li>
                    <li>JPL Small-Body Database (SBDB)</li>
                    <li>Planetary Data System (PDS) mission data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Page Export (Suspense boundary)
// ────────────────────────────────────────

export default function AsteroidWatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-20">
          <div
            className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin"
            style={{ borderWidth: '3px' }}
          />
        </div>
      }
    >
      <AsteroidWatchContent />
    </Suspense>
  );
}
