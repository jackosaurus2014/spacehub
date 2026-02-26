'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpaceAgency {
  name: string;
  country: string;
  flag: string;
  founded: number;
  headquarters: string;
  budget: number; // billions USD
  employees: number;
  director: string;
  website: string;
  capabilities: string[];
  notableMissions: string[];
  focus: string;
  region: 'North America' | 'Europe' | 'Asia-Pacific' | 'Middle East' | 'South America' | 'Africa';
}

// ---------------------------------------------------------------------------
// Data  (22 agencies)
// ---------------------------------------------------------------------------

const SPACE_AGENCIES: SpaceAgency[] = [
  {
    name: 'NASA',
    country: 'United States',
    flag: '\u{1F1FA}\u{1F1F8}',
    founded: 1958,
    headquarters: 'Washington, D.C.',
    budget: 25.4,
    employees: 18000,
    director: 'Bill Nelson',
    website: 'https://www.nasa.gov',
    capabilities: ['Human Spaceflight', 'Deep Space Exploration', 'Earth Science', 'Aeronautics', 'Planetary Defense'],
    notableMissions: ['Apollo 11', 'Space Shuttle', 'Hubble', 'Mars Perseverance', 'Artemis I', 'JWST'],
    focus: 'Full-spectrum space exploration, science, and aeronautics research',
    region: 'North America',
  },
  {
    name: 'ESA',
    country: 'Europe (22 member states)',
    flag: '\u{1F1EA}\u{1F1FA}',
    founded: 1975,
    headquarters: 'Paris, France',
    budget: 7.9,
    employees: 2200,
    director: 'Josef Aschbacher',
    website: 'https://www.esa.int',
    capabilities: ['Launch Vehicles', 'Earth Observation', 'Navigation', 'Science Missions', 'Human Spaceflight'],
    notableMissions: ['Rosetta', 'Gaia', 'JUICE', 'Ariane 6', 'Copernicus', 'ExoMars'],
    focus: 'Collaborative European space exploration, Earth observation, and science',
    region: 'Europe',
  },
  {
    name: 'JAXA',
    country: 'Japan',
    flag: '\u{1F1EF}\u{1F1F5}',
    founded: 2003,
    headquarters: 'Chofu, Tokyo',
    budget: 3.2,
    employees: 1500,
    director: 'Hiroshi Yamakawa',
    website: 'https://www.jaxa.jp',
    capabilities: ['Launch Vehicles', 'Asteroid Sample Return', 'Earth Observation', 'ISS Operations', 'Lunar Exploration'],
    notableMissions: ['Hayabusa2', 'SLIM', 'H3', 'Kibo (ISS)', 'ALOS', 'MMX'],
    focus: 'Asteroid science, lunar exploration, and advanced space technology',
    region: 'Asia-Pacific',
  },
  {
    name: 'ISRO',
    country: 'India',
    flag: '\u{1F1EE}\u{1F1F3}',
    founded: 1969,
    headquarters: 'Bengaluru, Karnataka',
    budget: 1.9,
    employees: 17000,
    director: 'S. Somanath',
    website: 'https://www.isro.gov.in',
    capabilities: ['Launch Vehicles', 'Lunar Exploration', 'Mars Orbiter', 'Earth Observation', 'Navigation (NavIC)'],
    notableMissions: ['Chandrayaan-3', 'Mangalyaan', 'Gaganyaan', 'PSLV', 'GSLV Mk III', 'Aditya-L1'],
    focus: 'Cost-effective space access, lunar science, and national development',
    region: 'Asia-Pacific',
  },
  {
    name: 'CNSA',
    country: 'China',
    flag: '\u{1F1E8}\u{1F1F3}',
    founded: 1993,
    headquarters: 'Beijing',
    budget: 14.0,
    employees: 150000,
    director: 'Zhang Kejian',
    website: 'http://www.cnsa.gov.cn',
    capabilities: ['Human Spaceflight', 'Space Station', 'Lunar Exploration', 'Mars Exploration', 'Navigation (BeiDou)'],
    notableMissions: ['Tiangong Space Station', 'Chang\'e 5/6', 'Tianwen-1', 'Shenzhou', 'BeiDou', 'Long March 9'],
    focus: 'Rapid buildup of independent space capabilities and deep space exploration',
    region: 'Asia-Pacific',
  },
  {
    name: 'Roscosmos',
    country: 'Russia',
    flag: '\u{1F1F7}\u{1F1FA}',
    founded: 1992,
    headquarters: 'Moscow',
    budget: 3.8,
    employees: 170000,
    director: 'Yuri Borisov',
    website: 'https://www.roscosmos.ru',
    capabilities: ['Human Spaceflight', 'Launch Vehicles', 'Space Station (ISS)', 'Navigation (GLONASS)', 'Military Space'],
    notableMissions: ['Soyuz Program', 'ISS Modules', 'GLONASS', 'Luna 25', 'Angara', 'Spektr-RG'],
    focus: 'Maintaining legacy launch capability and ISS partnership',
    region: 'Europe',
  },
  {
    name: 'CSA',
    country: 'Canada',
    flag: '\u{1F1E8}\u{1F1E6}',
    founded: 1989,
    headquarters: 'Longueuil, Quebec',
    budget: 0.4,
    employees: 700,
    director: 'Lisa Campbell',
    website: 'https://www.asc-csa.gc.ca',
    capabilities: ['Robotics', 'Earth Observation', 'Satellite Communications', 'ISS Contributions', 'Lunar Gateway'],
    notableMissions: ['Canadarm', 'Canadarm2', 'RADARSAT', 'Canadarm3', 'OSIRIS-REx (contrib.)'],
    focus: 'Space robotics, Earth observation, and international partnerships',
    region: 'North America',
  },
  {
    name: 'KARI',
    country: 'South Korea',
    flag: '\u{1F1F0}\u{1F1F7}',
    founded: 1989,
    headquarters: 'Daejeon',
    budget: 0.7,
    employees: 1000,
    director: 'Lee Sang-ryool',
    website: 'https://www.kari.re.kr',
    capabilities: ['Launch Vehicles', 'Lunar Orbiter', 'Earth Observation', 'Satellite Development'],
    notableMissions: ['KSLV-II (Nuri)', 'Danuri (KPLO)', 'Arirang', 'CAS500'],
    focus: 'Independent launch capability and lunar exploration',
    region: 'Asia-Pacific',
  },
  {
    name: 'ASI',
    country: 'Italy',
    flag: '\u{1F1EE}\u{1F1F9}',
    founded: 1988,
    headquarters: 'Rome',
    budget: 1.1,
    employees: 350,
    director: 'Teodoro Valente',
    website: 'https://www.asi.it',
    capabilities: ['Earth Observation', 'Launch Vehicles (Vega)', 'Radar Satellites', 'ISS Contributions', 'Planetary Science'],
    notableMissions: ['COSMO-SkyMed', 'Vega-C', 'LICIACube', 'PLATiNO', 'PRISMA'],
    focus: 'Radar Earth observation, small launch vehicles, and ESA partnership',
    region: 'Europe',
  },
  {
    name: 'CNES',
    country: 'France',
    flag: '\u{1F1EB}\u{1F1F7}',
    founded: 1961,
    headquarters: 'Paris & Toulouse',
    budget: 3.1,
    employees: 2400,
    director: 'Philippe Baptiste',
    website: 'https://www.cnes.fr',
    capabilities: ['Launch Vehicles', 'Earth Observation', 'Defense Space', 'Climate Science', 'Telecommunications'],
    notableMissions: ['Ariane 6 (lead)', 'SVOM', 'MERLIN', 'CSO Defense', 'SPOT/Pleiades'],
    focus: 'European launch leadership, defense space, and climate monitoring',
    region: 'Europe',
  },
  {
    name: 'DLR',
    country: 'Germany',
    flag: '\u{1F1E9}\u{1F1EA}',
    founded: 1969,
    headquarters: 'Cologne',
    budget: 2.1,
    employees: 10000,
    director: 'Anke Kaysser-Pyzalla',
    website: 'https://www.dlr.de',
    capabilities: ['Aeronautics', 'Earth Observation', 'Robotics', 'ISS Research', 'Space Transportation'],
    notableMissions: ['Columbus (ISS)', 'EnMAP', 'MASCOT', 'ReFEx', 'Eu:CROPIS'],
    focus: 'Aerospace research, Earth observation, and robotics technology',
    region: 'Europe',
  },
  {
    name: 'UKSA',
    country: 'United Kingdom',
    flag: '\u{1F1EC}\u{1F1E7}',
    founded: 2010,
    headquarters: 'Swindon, England',
    budget: 0.8,
    employees: 200,
    director: 'Paul Bate',
    website: 'https://www.gov.uk/uksa',
    capabilities: ['Satellite Communications', 'Earth Observation', 'Navigation', 'Space Sustainability', 'Launch Sites'],
    notableMissions: ['OneWeb Investment', 'SaxaVord Spaceport', 'TRUTHS', 'Skynet 6', 'NovaSAR'],
    focus: 'Commercial space growth, sovereign launch capability, and sustainability',
    region: 'Europe',
  },
  {
    name: 'AEB',
    country: 'Brazil',
    flag: '\u{1F1E7}\u{1F1F7}',
    founded: 1994,
    headquarters: 'Brasilia',
    budget: 0.05,
    employees: 300,
    director: 'Luciano Duarte',
    website: 'https://www.gov.br/aeb',
    capabilities: ['Earth Observation', 'Launch Site (Alcantara)', 'Satellite Development', 'Remote Sensing'],
    notableMissions: ['CBERS (China-Brazil)', 'Amazonia-1', 'SGDC', 'VLS (development)', 'Alcantara Launch Center'],
    focus: 'Amazon rainforest monitoring, equatorial launch site, and South-South cooperation',
    region: 'South America',
  },
  {
    name: 'UAESA',
    country: 'United Arab Emirates',
    flag: '\u{1F1E6}\u{1F1EA}',
    founded: 2014,
    headquarters: 'Abu Dhabi',
    budget: 0.6,
    employees: 250,
    director: 'Sarah Al Amiri',
    website: 'https://space.gov.ae',
    capabilities: ['Mars Exploration', 'Earth Observation', 'Astronaut Program', 'Lunar Rovers', 'Space Industry'],
    notableMissions: ['Hope Mars Orbiter', 'Rashid Rover', 'MBR Explorer', 'KhalifaSat', 'Hazzaa Al Mansoori (ISS)'],
    focus: 'Ambitious Mars and lunar programs, inspiring a knowledge-based economy',
    region: 'Middle East',
  },
  {
    name: 'SAC (Saudi Space Agency)',
    country: 'Saudi Arabia',
    flag: '\u{1F1F8}\u{1F1E6}',
    founded: 2018,
    headquarters: 'Riyadh',
    budget: 0.3,
    employees: 150,
    director: 'Mohammed Al-Tamimi',
    website: 'https://saudispace.gov.sa',
    capabilities: ['Earth Observation', 'Satellite Communications', 'Astronaut Program', 'Space Research'],
    notableMissions: ['Saudi Sat Series', 'Ax-2 Crew Mission', 'Vision 2030 Space', 'SaudiComSat'],
    focus: 'Building sovereign space capabilities under Vision 2030',
    region: 'Middle East',
  },
  {
    name: 'ASA',
    country: 'Australia',
    flag: '\u{1F1E6}\u{1F1FA}',
    founded: 2018,
    headquarters: 'Adelaide, South Australia',
    budget: 0.3,
    employees: 240,
    director: 'Enrico Palermo',
    website: 'https://www.space.gov.au',
    capabilities: ['Earth Observation', 'Space Situational Awareness', 'Communications', 'Robotics', 'Launch Services'],
    notableMissions: ['Moon to Mars Initiative', 'National Space Mission', 'Binar CubeSat', 'Gilmour Space'],
    focus: 'Growing domestic space industry and supporting Artemis Accords',
    region: 'Asia-Pacific',
  },
  {
    name: 'CONAE',
    country: 'Argentina',
    flag: '\u{1F1E6}\u{1F1F7}',
    founded: 1991,
    headquarters: 'Buenos Aires',
    budget: 0.06,
    employees: 800,
    director: 'Raul Kulichevsky',
    website: 'https://www.argentina.gob.ar/ciencia/conae',
    capabilities: ['Earth Observation', 'Satellite Development', 'Remote Sensing', 'Ground Stations'],
    notableMissions: ['SAOCOM-1A/1B', 'SAC-D/Aquarius', 'SABIA-Mar', 'Tronador II'],
    focus: 'SAR Earth observation and agricultural/environmental monitoring',
    region: 'South America',
  },
  {
    name: 'SUPARCO',
    country: 'Pakistan',
    flag: '\u{1F1F5}\u{1F1F0}',
    founded: 1961,
    headquarters: 'Islamabad',
    budget: 0.04,
    employees: 3500,
    director: 'Amer Nadeem',
    website: 'https://suparco.gov.pk',
    capabilities: ['Satellite Communications', 'Remote Sensing', 'Sounding Rockets', 'Ground Stations'],
    notableMissions: ['PAKSAT-1R', 'PRSS-1', 'Badr-1', 'iCube Qamar', 'PAKTES-1A'],
    focus: 'Communication satellites, remote sensing for national development',
    region: 'Asia-Pacific',
  },
  {
    name: 'ISA',
    country: 'Israel',
    flag: '\u{1F1EE}\u{1F1F1}',
    founded: 1983,
    headquarters: 'Tel Aviv',
    budget: 0.2,
    employees: 200,
    director: 'Uri Oron',
    website: 'https://www.space.gov.il',
    capabilities: ['Reconnaissance Satellites', 'Satellite Launch', 'Nanosatellites', 'Defense Space', 'Space Science'],
    notableMissions: ['EROS (recon)', 'Ofek Series', 'Beresheet (lunar)', 'Venus (VENuS)', 'Shavit Launch Vehicle'],
    focus: 'Defense-oriented satellite imagery and miniaturized space technology',
    region: 'Middle East',
  },
  {
    name: 'KSAT (Kongsberg Satellite Services)',
    country: 'Norway',
    flag: '\u{1F1F3}\u{1F1F4}',
    founded: 2002,
    headquarters: 'Tromso',
    budget: 0.15,
    employees: 600,
    director: 'Rolf Skatteboe',
    website: 'https://www.ksat.no',
    capabilities: ['Ground Station Network', 'Satellite Data Services', 'Arctic Monitoring', 'Maritime Surveillance'],
    notableMissions: ['SvalSat (Svalbard)', 'TrollSat (Antarctica)', 'Copernicus Ground Segment', 'AIS Ship Tracking'],
    focus: 'Global ground station infrastructure and polar satellite services',
    region: 'Europe',
  },
  {
    name: 'NSO (Netherlands Space Office)',
    country: 'Netherlands',
    flag: '\u{1F1F3}\u{1F1F1}',
    founded: 2009,
    headquarters: 'The Hague',
    budget: 0.18,
    employees: 60,
    director: 'Harm van de Wetering',
    website: 'https://www.spaceoffice.nl',
    capabilities: ['Earth Observation', 'Scientific Instruments', 'Satellite Communications', 'Space Research'],
    notableMissions: ['TROPOMI (Sentinel-5P)', 'OMI (Aura)', 'SRON Instruments', 'ISILAUNCH'],
    focus: 'Air quality monitoring instruments and scientific space research',
    region: 'Europe',
  },
  {
    name: 'SSAU (State Space Agency of Ukraine)',
    country: 'Ukraine',
    flag: '\u{1F1FA}\u{1F1E6}',
    founded: 1992,
    headquarters: 'Kyiv',
    budget: 0.05,
    employees: 8000,
    director: 'Volodymyr Taftai',
    website: 'https://www.nkau.gov.ua',
    capabilities: ['Launch Vehicles', 'Rocket Engines', 'Satellite Development', 'Space Manufacturing'],
    notableMissions: ['Zenit (heritage)', 'Sich-2', 'Cyclone-4', 'Antares (first stage)', 'Vega upper stage'],
    focus: 'Rocket propulsion heritage and space manufacturing expertise',
    region: 'Europe',
  },
];

// ---------------------------------------------------------------------------
// Derived constants
// ---------------------------------------------------------------------------

const ALL_CAPABILITIES = Array.from(
  new Set(SPACE_AGENCIES.flatMap((a) => a.capabilities))
).sort();

const ALL_REGIONS = Array.from(
  new Set(SPACE_AGENCIES.map((a) => a.region))
).sort();

const BUDGET_RANGES = [
  { label: 'All Budgets', min: 0, max: Infinity },
  { label: 'Over $10B', min: 10, max: Infinity },
  { label: '$1B - $10B', min: 1, max: 10 },
  { label: '$100M - $1B', min: 0.1, max: 1 },
  { label: 'Under $100M', min: 0, max: 0.1 },
];

type SortKey = 'budget' | 'founded' | 'employees' | 'name';

// ---------------------------------------------------------------------------
// Helper — format numbers
// ---------------------------------------------------------------------------

function fmtBudget(b: number): string {
  if (b >= 1) return `$${b.toFixed(1)}B`;
  return `$${(b * 1000).toFixed(0)}M`;
}

function fmtEmployees(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toLocaleString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SpaceAgenciesPage() {
  // --- Filter / sort state ---
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [capabilityFilter, setCapabilityFilter] = useState<string>('All');
  const [budgetRange, setBudgetRange] = useState<number>(0); // index into BUDGET_RANGES
  const [sortBy, setSortBy] = useState<SortKey>('budget');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Filtering & sorting ---
  const filtered = useMemo(() => {
    const range = BUDGET_RANGES[budgetRange];
    const list = SPACE_AGENCIES.filter((a) => {
      if (regionFilter !== 'All' && a.region !== regionFilter) return false;
      if (capabilityFilter !== 'All' && !a.capabilities.includes(capabilityFilter)) return false;
      if (a.budget < range.min || a.budget >= range.max) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.country.toLowerCase().includes(q) ||
          a.focus.toLowerCase().includes(q)
        );
      }
      return true;
    });

    list.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      switch (sortBy) {
        case 'budget':
          aVal = a.budget;
          bVal = b.budget;
          break;
        case 'founded':
          aVal = a.founded;
          bVal = b.founded;
          break;
        case 'employees':
          aVal = a.employees;
          bVal = b.employees;
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }
      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return list;
  }, [regionFilter, capabilityFilter, budgetRange, sortBy, sortDir, searchQuery]);

  // --- Budget chart data (top 10) ---
  const budgetChartAgencies = useMemo(
    () => [...SPACE_AGENCIES].sort((a, b) => b.budget - a.budget).slice(0, 10),
    []
  );
  const maxBudget = budgetChartAgencies[0]?.budget ?? 1;

  // --- Toggle sort ---
  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const toggleExpand = (name: string) => {
    setExpandedId((prev) => (prev === name ? null : name));
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Space Agency Profiles"
          subtitle="Comprehensive directory of the world's space agencies — budgets, capabilities, missions, and leadership."
          icon={<span>{'\u{1F3DB}\u{FE0F}'}</span>}
          accentColor="blue"
        />

        {/* Summary stats */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Agencies Tracked', value: SPACE_AGENCIES.length.toString() },
              {
                label: 'Combined Budget',
                value: fmtBudget(SPACE_AGENCIES.reduce((s, a) => s + a.budget, 0)),
              },
              {
                label: 'Total Workforce',
                value: `~${(SPACE_AGENCIES.reduce((s, a) => s + a.employees, 0) / 1000).toFixed(0)}K`,
              },
              { label: 'Regions Covered', value: ALL_REGIONS.length.toString() },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 text-center"
              >
                <p className="text-2xl font-bold text-blue-400">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Budget comparison chart */}
        <ScrollReveal>
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Budget Comparison (Top 10)
            </h2>
            <div className="space-y-3">
              {budgetChartAgencies.map((a) => {
                const pct = (a.budget / maxBudget) * 100;
                return (
                  <div key={a.name} className="flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">{a.flag}</span>
                    <span className="w-28 text-sm text-slate-300 truncate flex-shrink-0">
                      {a.name}
                    </span>
                    <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-200">
                        {fmtBudget(a.budget)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Filters & Search */}
        <ScrollReveal>
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Search agencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full sm:w-48"
              />

              {/* Region */}
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="All">All Regions</option>
                {ALL_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {/* Capabilities */}
              <select
                value={capabilityFilter}
                onChange={(e) => setCapabilityFilter(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="All">All Capabilities</option>
                {ALL_CAPABILITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Budget range */}
              <select
                value={budgetRange}
                onChange={(e) => setBudgetRange(Number(e.target.value))}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {BUDGET_RANGES.map((r, i) => (
                  <option key={r.label} value={i}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs text-slate-400 mr-1">Sort by:</span>
              {(
                [
                  { key: 'budget', label: 'Budget' },
                  { key: 'founded', label: 'Founded' },
                  { key: 'employees', label: 'Employees' },
                  { key: 'name', label: 'Name' },
                ] as { key: SortKey; label: string }[]
              ).map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleSort(s.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === s.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                  {sortBy === s.key && (
                    <span className="ml-1">{sortDir === 'desc' ? '\u2193' : '\u2191'}</span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Showing {filtered.length} of {SPACE_AGENCIES.length} agencies
            </p>
          </div>
        </ScrollReveal>

        {/* Agency cards */}
        <div className="space-y-4 mb-12">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <p className="text-lg">No agencies match your filters.</p>
              <button
                onClick={() => {
                  setRegionFilter('All');
                  setCapabilityFilter('All');
                  setBudgetRange(0);
                  setSearchQuery('');
                }}
                className="mt-3 text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Reset filters
              </button>
            </div>
          )}

          {filtered.map((agency, idx) => {
            const isExpanded = expandedId === agency.name;
            return (
              <ScrollReveal key={agency.name} delay={idx * 0.04}>
                <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl overflow-hidden hover:border-blue-500/40 transition-colors">
                  {/* Collapsed header */}
                  <button
                    onClick={() => toggleExpand(agency.name)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4 group"
                  >
                    <span className="text-3xl flex-shrink-0">{agency.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">
                          {agency.name}
                        </h3>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                          Est. {agency.founded}
                        </span>
                        <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">
                          {agency.region}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{agency.country}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-400">
                          {fmtBudget(agency.budget)}
                        </p>
                        <p className="text-xs text-slate-500">Budget</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-emerald-400">
                          {fmtEmployees(agency.employees)}
                        </p>
                        <p className="text-xs text-slate-500">Staff</p>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/60 px-5 py-5 bg-slate-900/40">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left column — info */}
                        <div className="space-y-4">
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {agency.focus}
                          </p>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-slate-500">Headquarters</span>
                              <p className="text-slate-200">{agency.headquarters}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Director</span>
                              <p className="text-slate-200">{agency.director}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Annual Budget</span>
                              <p className="text-blue-400 font-medium">
                                {fmtBudget(agency.budget)}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Employees</span>
                              <p className="text-emerald-400 font-medium">
                                {agency.employees.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Founded</span>
                              <p className="text-slate-200">{agency.founded}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Website</span>
                              <a
                                href={agency.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline text-xs break-all"
                              >
                                {agency.website.replace(/^https?:\/\//, '')}
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Right column — capabilities & missions */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                              Capabilities
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {agency.capabilities.map((cap) => (
                                <span
                                  key={cap}
                                  className="px-2 py-1 text-xs rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/30"
                                >
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                              Notable Missions
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {agency.notableMissions.map((m) => (
                                <span
                                  key={m}
                                  className="px-2 py-1 text-xs rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-700/30"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Budget bar within detail */}
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-24 flex-shrink-0">
                            Global share
                          </span>
                          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                              style={{
                                width: `${(agency.budget / SPACE_AGENCIES.reduce((s, a) => s + a.budget, 0)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-12 text-right flex-shrink-0">
                            {(
                              (agency.budget /
                                SPACE_AGENCIES.reduce((s, a) => s + a.budget, 0)) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Related links */}
        <ScrollReveal>
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Related Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  href: '/government-budgets',
                  label: 'Government Space Budgets',
                  desc: 'Detailed budget analysis and trends',
                  icon: '\u{1F4B0}',
                },
                {
                  href: '/compliance',
                  label: 'Regulatory & Compliance',
                  desc: 'Space treaties and regulatory filings',
                  icon: '\u{1F4DC}',
                },
                {
                  href: '/regulations',
                  label: 'Space Regulations',
                  desc: 'International space law framework',
                  icon: '\u{2696}\u{FE0F}',
                },
                {
                  href: '/glossary',
                  label: 'Space Glossary',
                  desc: 'Key terms and acronyms',
                  icon: '\u{1F4D6}',
                },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/40 hover:border-blue-500/40 hover:bg-slate-800 transition-colors group"
                >
                  <span className="text-xl flex-shrink-0">{link.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200 group-hover:text-blue-300 transition-colors">
                      {link.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{link.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-8 mb-4">
          Data compiled from publicly available agency reports and budgets. Budget figures are
          approximate annual estimates in USD. Last updated February 2026.
        </p>
      </div>
    </div>
  );
}