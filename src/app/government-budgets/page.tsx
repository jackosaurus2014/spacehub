'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

interface Agency {
  name: string;
  country: string;
  flag: string;
  budget: number; // billions USD
  region: 'North America' | 'Europe' | 'Asia-Pacific' | 'Middle East' | 'Other';
  category: 'Civil' | 'Military' | 'Mixed';
  population: number; // millions
  gdp: number; // trillions USD
  trend: number; // % change YoY
  keyPrograms: string[];
}

const AGENCIES: Agency[] = [
  { name: 'DoD Space (USSF, NRO, MDA, DARPA)', country: 'United States', flag: '🇺🇸', budget: 30.1, region: 'North America', category: 'Military', population: 334, gdp: 28.8, trend: 8.2, keyPrograms: ['SDA Transport Layer', 'GPS III', 'SBIRS', 'Next-Gen OPIR'] },
  { name: 'NASA', country: 'United States', flag: '🇺🇸', budget: 25.4, region: 'North America', category: 'Civil', population: 334, gdp: 28.8, trend: 1.5, keyPrograms: ['Artemis', 'SLS', 'Orion', 'Commercial Crew', 'JWST Ops'] },
  { name: 'CNSA', country: 'China', flag: '🇨🇳', budget: 14.0, region: 'Asia-Pacific', category: 'Mixed', population: 1412, gdp: 18.5, trend: 12.0, keyPrograms: ['CSS (Tiangong)', 'Chang\'e Lunar', 'BeiDou', 'Long March 9'] },
  { name: 'ESA', country: 'Europe (22 states)', flag: '🇪🇺', budget: 7.9, region: 'Europe', category: 'Civil', population: 450, gdp: 18.4, trend: 3.1, keyPrograms: ['Copernicus', 'Galileo', 'Ariane 6', 'ExoMars', 'JUICE'] },
  { name: 'Roscosmos', country: 'Russia', flag: '🇷🇺', budget: 3.8, region: 'Other', category: 'Mixed', population: 144, gdp: 2.2, trend: -5.2, keyPrograms: ['ISS Segment', 'GLONASS', 'Angara', 'Luna Program'] },
  { name: 'JAXA', country: 'Japan', flag: '🇯🇵', budget: 3.2, region: 'Asia-Pacific', category: 'Civil', population: 125, gdp: 4.2, trend: 4.8, keyPrograms: ['H3', 'SLIM', 'MMX (Martian Moons)', 'Hayabusa'] },
  { name: 'CNES', country: 'France', flag: '🇫🇷', budget: 3.1, region: 'Europe', category: 'Civil', population: 68, gdp: 3.0, trend: 2.1, keyPrograms: ['Ariane 6 (lead)', 'CSO Defense', 'SVOM', 'MERLIN'] },
  { name: 'DLR', country: 'Germany', flag: '🇩🇪', budget: 2.1, region: 'Europe', category: 'Civil', population: 84, gdp: 4.5, trend: 1.8, keyPrograms: ['Columbus', 'EnMAP', 'MASCOT', 'ReFEx'] },
  { name: 'ISRO', country: 'India', flag: '🇮🇳', budget: 1.9, region: 'Asia-Pacific', category: 'Civil', population: 1440, gdp: 3.7, trend: 15.4, keyPrograms: ['Gaganyaan', 'Chandrayaan', 'GSLV Mk III', 'NavIC'] },
  { name: 'ASI', country: 'Italy', flag: '🇮🇹', budget: 1.1, region: 'Europe', category: 'Civil', population: 59, gdp: 2.3, trend: 3.5, keyPrograms: ['COSMO-SkyMed', 'Vega-C', 'PLATiNO', 'LICIACube'] },
  { name: 'UKSA', country: 'United Kingdom', flag: '🇬🇧', budget: 0.8, region: 'Europe', category: 'Civil', population: 67, gdp: 3.3, trend: 6.2, keyPrograms: ['OneWeb Investment', 'SaxaVord Spaceport', 'TRUTHS', 'Skynet 6'] },
  { name: 'KARI', country: 'South Korea', flag: '🇰🇷', budget: 0.7, region: 'Asia-Pacific', category: 'Civil', population: 52, gdp: 1.7, trend: 18.5, keyPrograms: ['KSLV-II (Nuri)', 'KPLO (Danuri)', 'Korea GPS'] },
  { name: 'UAE Space Agency', country: 'United Arab Emirates', flag: '🇦🇪', budget: 0.6, region: 'Middle East', category: 'Civil', population: 10, gdp: 0.5, trend: 22.0, keyPrograms: ['Hope Mars', 'MBR Explorer', 'Rashid Rover', 'Sirb Satellite'] },
  { name: 'CSA', country: 'Canada', flag: '🇨🇦', budget: 0.4, region: 'North America', category: 'Civil', population: 40, gdp: 2.1, trend: 5.0, keyPrograms: ['Canadarm3', 'RADARSAT', 'Lunar Gateway Contribution'] },
  { name: 'ASA', country: 'Australia', flag: '🇦🇺', budget: 0.3, region: 'Asia-Pacific', category: 'Civil', population: 26, gdp: 1.7, trend: 25.0, keyPrograms: ['Moon to Mars', 'Gilmour Space', 'National Space Mission'] },
];

const KEY_PROGRAMS = [
  { name: 'Artemis Program', agency: 'NASA', budget: 7.5, description: 'Return humans to the Moon by 2027', status: 'Active' },
  { name: 'SLS + Orion', agency: 'NASA', budget: 4.0, description: 'Super heavy-lift launch vehicle + crew capsule', status: 'Active' },
  { name: 'SDA Transport Layer', agency: 'DoD/SDA', budget: 3.2, description: 'LEO mesh for military comms & missile tracking', status: 'Deploying' },
  { name: 'GPS III/IIIF', agency: 'USSF', budget: 1.8, description: 'Next-gen navigation with M-code', status: 'Deploying' },
  { name: 'Galileo 2nd Gen', agency: 'ESA', budget: 1.5, description: 'European navigation constellation upgrade', status: 'Development' },
  { name: 'Gaganyaan', agency: 'ISRO', budget: 1.3, description: 'India\'s first crewed spaceflight program', status: 'Testing' },
  { name: 'Commercial Crew', agency: 'NASA', budget: 0.8, description: 'SpaceX Crew Dragon + Boeing Starliner ISS transport', status: 'Operational' },
  { name: 'Copernicus Expansion', agency: 'ESA/EC', budget: 0.7, description: 'Six new Sentinel satellites for Earth monitoring', status: 'Development' },
];

const REGIONS = ['All', 'North America', 'Europe', 'Asia-Pacific', 'Middle East', 'Other'] as const;
type SortKey = 'budget' | 'perCapita' | 'pctGdp' | 'trend' | 'name';

export default function GovernmentBudgetsPage() {
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortKey>('budget');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const totalGlobal = useMemo(() => AGENCIES.reduce((sum, a) => sum + a.budget, 0), []);

  const filtered = useMemo(() => {
    const list = regionFilter === 'All' ? [...AGENCIES] : AGENCIES.filter(a => a.region === regionFilter);
    list.sort((a, b) => {
      let aVal: number | string, bVal: number | string;
      switch (sortBy) {
        case 'budget': aVal = a.budget; bVal = b.budget; break;
        case 'perCapita': aVal = (a.budget * 1000) / a.population; bVal = (b.budget * 1000) / b.population; break;
        case 'pctGdp': aVal = (a.budget / a.gdp) * 100; bVal = (b.budget / b.gdp) * 100; break;
        case 'trend': aVal = a.trend; bVal = b.trend; break;
        default: aVal = a.name; bVal = b.name;
      }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return list;
  }, [regionFilter, sortBy, sortDir]);

  const maxBudget = Math.max(...AGENCIES.map(a => a.budget));

  const regionBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    AGENCIES.forEach(a => { map[a.region] = (map[a.region] || 0) + a.budget; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([region, amount]) => ({
      region, amount, pct: ((amount / totalGlobal) * 100).toFixed(1),
    }));
  }, [totalGlobal]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <AnimatedPageHeader
          title="Government Space Budgets"
          subtitle="Track government space spending across 15+ agencies worldwide. Comprehensive budget data, per-capita analysis, and key program funding."
          icon="🏛️"
          accentColor="purple"
        />

        {/* Global Stats */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Global Space Spending', value: `$${totalGlobal.toFixed(1)}B`, sub: '2024 Estimate' },
              { label: 'Agencies Tracked', value: '15+', sub: 'Government Programs' },
              { label: 'Largest Spender', value: 'DoD Space', sub: '$30.1B (Military)' },
              { label: 'Fastest Growing', value: 'Australia', sub: '+25% YoY' },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                <p className="text-xs text-white/70 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Filters + Sort */}
        <ScrollReveal delay={0.15}>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-sm text-slate-400">Region:</span>
            {REGIONS.map(r => (
              <button key={r} onClick={() => setRegionFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${regionFilter === r ? 'bg-white/10 text-white/90 border border-white/10' : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-slate-900'}`}>
                {r}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-500">Sort:</span>
              {([['budget', 'Budget'], ['perCapita', 'Per Capita'], ['pctGdp', '% GDP'], ['trend', 'Growth']] as [SortKey, string][]).map(([key, label]) => (
                <button key={key} onClick={() => handleSort(key)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${sortBy === key ? 'bg-purple-500/20 text-purple-300' : 'text-slate-500 hover:text-white/70'}`}>
                  {label} {sortBy === key && (sortDir === 'desc' ? '↓' : '↑')}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Agency Budget Table */}
        <ScrollReveal delay={0.2}>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Agency</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Budget</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase text-left" style={{ width: '30%' }}>Relative</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Per Capita</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">% GDP</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">YoY Change</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((agency, i) => {
                    const perCapita = (agency.budget * 1000) / agency.population;
                    const pctGdp = (agency.budget / agency.gdp) * 100;
                    return (
                      <tr key={agency.name} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{agency.flag}</span>
                            <div>
                              <p className="text-sm font-medium text-white">{agency.name}</p>
                              <p className="text-xs text-slate-500">{agency.country}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-white">${agency.budget.toFixed(1)}B</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-full bg-white/[0.04] rounded-full h-2.5">
                            <div className="h-2.5 rounded-full bg-gradient-to-r from-white to-purple-500 transition-all"
                              style={{ width: `${(agency.budget / maxBudget) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-white/70">${perCapita.toFixed(1)}M/M</td>
                        <td className="px-4 py-3 text-right text-sm text-white/70">{pctGdp.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-medium ${agency.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {agency.trend >= 0 ? '+' : ''}{agency.trend.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 mb-8">
            {filtered.map((agency) => {
              const perCapita = (agency.budget * 1000) / agency.population;
              const pctGdp = (agency.budget / agency.gdp) * 100;
              return (
                <div key={agency.name} className="card p-4">
                  {/* Agency header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-xl">{agency.flag}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{agency.name}</p>
                      <p className="text-xs text-slate-500">{agency.country}</p>
                    </div>
                  </div>

                  {/* Budget amount */}
                  <p className="text-2xl font-bold text-white mb-3">${agency.budget.toFixed(1)}B</p>

                  {/* Relative progress bar */}
                  <div className="w-full bg-white/[0.04] rounded-full h-2 mb-3">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-white to-purple-500 transition-all"
                      style={{ width: `${(agency.budget / maxBudget) * 100}%` }}
                    />
                  </div>

                  {/* Two-column stats */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-500">Per Capita</p>
                      <p className="text-sm font-medium text-white/90">${perCapita.toFixed(1)}M/M</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-500">% GDP</p>
                      <p className="text-sm font-medium text-white/90">{pctGdp.toFixed(2)}%</p>
                    </div>
                  </div>

                  {/* YoY change badge */}
                  <div className="flex items-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      agency.trend >= 0
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      {agency.trend >= 0 ? '↑' : '↓'} {agency.trend >= 0 ? '+' : ''}{agency.trend.toFixed(1)}% YoY
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Regional Breakdown + Category Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ScrollReveal delay={0.25}>
            <div className="card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Regional Distribution</h3>
              <div className="space-y-3">
                {regionBreakdown.map(r => (
                  <div key={r.region}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">{r.region}</span>
                      <span className="text-white font-medium">${r.amount.toFixed(1)}B ({r.pct}%)</span>
                    </div>
                    <div className="w-full bg-white/[0.04] rounded-full h-3">
                      <div className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-slate-200 transition-all"
                        style={{ width: `${parseFloat(r.pct)}%` }} />

        <RelatedModules modules={PAGE_RELATIONS['government-budgets']} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <div className="card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Spending Category</h3>
              <div className="space-y-4">
                {[
                  { label: 'Military Space', pct: 52, amount: 53.6, color: 'from-red-500 to-orange-500' },
                  { label: 'Civil Space', pct: 38, amount: 39.1, color: 'from-white to-blue-500' },
                  { label: 'Intelligence', pct: 10, amount: 10.3, color: 'from-purple-500 to-pink-500' },
                ].map(cat => (
                  <div key={cat.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">{cat.label}</span>
                      <span className="text-white font-medium">${cat.amount}B ({cat.pct}%)</span>
                    </div>
                    <div className="w-full bg-white/[0.04] rounded-full h-3">
                      <div className={`h-3 rounded-full bg-gradient-to-r ${cat.color}`}
                        style={{ width: `${cat.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <h4 className="text-sm font-semibold text-white/70 mb-3">Per Capita Leaders</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { country: '🇱🇺 Luxembourg', value: '$320' },
                    { country: '🇺🇸 United States', value: '$168' },
                    { country: '🇫🇷 France', value: '$47' },
                    { country: '🇯🇵 Japan', value: '$25' },
                    { country: '🇩🇪 Germany', value: '$24' },
                    { country: '🇮🇳 India', value: '$1.40' },
                  ].map(item => (
                    <div key={item.country} className="flex justify-between text-xs bg-white/[0.03] rounded-lg px-3 py-2">
                      <span className="text-white/70">{item.country}</span>
                      <span className="text-white/70 font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Key Programs */}
        <ScrollReveal delay={0.35}>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>🎯</span> Key Programs by Budget
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {KEY_PROGRAMS.map(prog => (
                <div key={prog.name} className="card p-4 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-bold text-white">{prog.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      prog.status === 'Operational' ? 'bg-emerald-500/20 text-emerald-400' :
                      prog.status === 'Active' ? 'bg-white/10 text-white/70' :
                      prog.status === 'Deploying' ? 'bg-yellow-500/20 text-yellow-400' :
                      prog.status === 'Testing' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>{prog.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{prog.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-white">${prog.budget}B</span>
                    <span className="text-xs text-slate-500">{prog.agency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Data Note */}
        <ScrollReveal delay={0.4}>
          <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">
              Budget figures are 2024 estimates based on public budget documents, appropriations bills, and industry analysis.
              Some figures (China, Russia) are estimates due to limited public disclosure. Military space budgets include dedicated space programs only.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
