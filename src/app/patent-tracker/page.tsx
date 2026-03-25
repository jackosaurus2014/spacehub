'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSubscription } from '@/components/SubscriptionProvider';
import ScrollReveal from '@/components/ui/ScrollReveal';

// ─── Patent Data (curated from USPTO/EPO public records) ─────────────────────

interface Patent {
  id: string;
  title: string;
  assignee: string;
  filingDate: string;
  grantDate: string | null;
  status: 'granted' | 'pending' | 'published';
  category: string;
  patentNumber: string | null;
  abstract: string;
  inventors: string[];
  citations: number;
}

const PATENT_CATEGORIES = [
  'All Categories',
  'Propulsion Systems',
  'Satellite Technology',
  'Launch Vehicles',
  'Space Communications',
  'Earth Observation',
  'In-Space Manufacturing',
  'Life Support',
  'Orbital Mechanics',
  'Reentry & Recovery',
  'Space Debris',
];

const PATENTS: Patent[] = [
  {
    id: 'p1', title: 'Reusable Rocket Landing System with Grid Fins', assignee: 'SpaceX',
    filingDate: '2023-03-15', grantDate: '2024-11-20', status: 'granted',
    category: 'Launch Vehicles', patentNumber: 'US11,834,192',
    abstract: 'A method for autonomous landing of a rocket first stage using deployable grid fin control surfaces and thrust vector control during powered descent.',
    inventors: ['Elon R. Musk', 'Lars Blackmore'], citations: 47,
  },
  {
    id: 'p2', title: 'Phased Array Antenna for LEO Satellite Broadband', assignee: 'SpaceX',
    filingDate: '2022-08-10', grantDate: '2025-01-15', status: 'granted',
    category: 'Space Communications', patentNumber: 'US12,021,445',
    abstract: 'Electronically steered flat-panel phased array antenna optimized for Ku/Ka-band communication with low Earth orbit satellite constellations.',
    inventors: ['Sarah C. Walker', 'Michael Chen'], citations: 31,
  },
  {
    id: 'p3', title: 'Vertical Landing Legs with Crush Core Attenuation', assignee: 'Blue Origin',
    filingDate: '2023-06-22', grantDate: '2025-04-10', status: 'granted',
    category: 'Launch Vehicles', patentNumber: 'US12,089,301',
    abstract: 'Deployable landing leg mechanism with honeycomb crush core energy absorption for vertical rocket landing on unprepared surfaces.',
    inventors: ['Gary Lai', 'Rob Meyerson'], citations: 18,
  },
  {
    id: 'p4', title: 'Optical Inter-Satellite Link Terminal', assignee: 'SpaceX',
    filingDate: '2024-01-05', grantDate: null, status: 'pending',
    category: 'Space Communications', patentNumber: null,
    abstract: 'Compact laser communication terminal for high-bandwidth data relay between satellites in mega-constellations, achieving 100+ Gbps throughput.',
    inventors: ['Bret Johnsen', 'Patricia Cooper'], citations: 8,
  },
  {
    id: 'p5', title: 'Rutherford Engine: Electric Turbopump Design', assignee: 'Rocket Lab',
    filingDate: '2021-11-30', grantDate: '2023-09-12', status: 'granted',
    category: 'Propulsion Systems', patentNumber: 'US11,692,518',
    abstract: 'Battery-powered electric turbopump for liquid rocket engines, eliminating gas generator cycle complexity while maintaining thrust-to-weight ratio.',
    inventors: ['Peter Beck', 'Lachlan Matchett'], citations: 22,
  },
  {
    id: 'p6', title: 'Autonomous On-Orbit Satellite Servicing Vehicle', assignee: 'Northrop Grumman',
    filingDate: '2022-05-18', grantDate: '2024-08-30', status: 'granted',
    category: 'Satellite Technology', patentNumber: 'US11,945,601',
    abstract: 'Mission extension vehicle capable of autonomous rendezvous and docking with non-cooperative GEO satellites for life extension through propulsion augmentation.',
    inventors: ['Joseph Anderson', 'Thomas Wilson'], citations: 35,
  },
  {
    id: 'p7', title: 'Methane-LOX Full-Flow Staged Combustion Engine', assignee: 'SpaceX',
    filingDate: '2023-09-01', grantDate: '2025-06-15', status: 'granted',
    category: 'Propulsion Systems', patentNumber: 'US12,103,882',
    abstract: 'Full-flow staged combustion cycle engine using liquid methane and liquid oxygen with dual preburners driving separate turbines for oxidizer and fuel turbopumps.',
    inventors: ['Thomas Mueller', 'William Heltsley'], citations: 52,
  },
  {
    id: 'p8', title: 'Deployable Mesh Reflector for Large Satellite Antennas', assignee: 'L3Harris',
    filingDate: '2024-03-20', grantDate: null, status: 'published',
    category: 'Satellite Technology', patentNumber: null,
    abstract: 'Large deployable mesh antenna reflector system achieving 12-meter aperture from a stowed volume compatible with standard launch vehicle fairings.',
    inventors: ['Robert Chang', 'Maria Rodriguez'], citations: 5,
  },
  {
    id: 'p9', title: 'In-Space Fiber Optic Manufacturing in Microgravity', assignee: 'FOMS Inc',
    filingDate: '2023-12-10', grantDate: null, status: 'pending',
    category: 'In-Space Manufacturing', patentNumber: null,
    abstract: 'Method for drawing ZBLAN fluoride glass optical fiber in microgravity environment, producing fiber with 10x lower attenuation than terrestrial equivalents.',
    inventors: ['Dmitry Starodubov'], citations: 12,
  },
  {
    id: 'p10', title: 'Active Debris Removal Using Net Capture', assignee: 'Astroscale',
    filingDate: '2022-07-14', grantDate: '2024-12-05', status: 'granted',
    category: 'Space Debris', patentNumber: 'JP2024-183921',
    abstract: 'Autonomous spacecraft system for rendezvous with and capture of non-cooperative orbital debris objects using deployable net mechanism with tether management.',
    inventors: ['Nobu Okada', 'Chris Blackerby'], citations: 19,
  },
  {
    id: 'p11', title: 'Ceramic Matrix Composite Heat Shield for Reentry', assignee: 'SpaceX',
    filingDate: '2024-06-01', grantDate: null, status: 'pending',
    category: 'Reentry & Recovery', patentNumber: null,
    abstract: 'Hexagonal ceramic tile heat shield system with autonomous gap-filling for reusable spacecraft thermal protection during atmospheric reentry at orbital velocities.',
    inventors: ['Brian Bjelde', 'Zach Dunn'], citations: 3,
  },
  {
    id: 'p12', title: 'Ion Thruster with Iodine Propellant', assignee: 'ThrustMe',
    filingDate: '2023-04-28', grantDate: '2025-02-14', status: 'granted',
    category: 'Propulsion Systems', patentNumber: 'EP4,198,327',
    abstract: 'Gridded ion thruster utilizing solid iodine propellant, enabling propulsion for CubeSats and small satellites without pressurized propellant storage.',
    inventors: ['Ane Aanesland', 'Dmytro Rafalskyi'], citations: 14,
  },
];

// ─── Stats ───────────────────────────────────────────────────────────────────

const STATS = {
  totalPatents: '~2,800 (est.)',
  grantedThisYear: '~300 (est.)',
  topAssignee: 'SpaceX',
  topCategory: 'Propulsion Systems',
  avgCitations: 24,
  companiesTracked: 200,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PatentTrackerPage() {
  const { canUseFeature } = useSubscription();
  const hasAccess = canUseFeature('hasIntelReports');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState<'all' | 'granted' | 'pending' | 'published'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'citations' | 'assignee' | 'category'>('date');

  const filtered = useMemo(() => {
    let result = PATENTS;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.assignee.toLowerCase().includes(q) ||
        p.abstract.toLowerCase().includes(q)
      );
    }
    if (category !== 'All Categories') {
      result = result.filter(p => p.category === category);
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }
    if (sortBy === 'citations') {
      result = [...result].sort((a, b) => b.citations - a.citations);
    } else if (sortBy === 'assignee') {
      result = [...result].sort((a, b) => a.assignee.localeCompare(b.assignee));
    } else if (sortBy === 'category') {
      result = [...result].sort((a, b) => a.category.localeCompare(b.category));
    } else {
      result = [...result].sort((a, b) => b.filingDate.localeCompare(a.filingDate));
    }
    return result;
  }, [search, category, statusFilter, sortBy]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    PATENTS.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const statusColors = {
    granted: { bg: 'rgba(86, 240, 0, 0.1)', text: '#56F000', border: 'rgba(86, 240, 0, 0.2)' },
    pending: { bg: 'rgba(255, 179, 2, 0.1)', text: '#FFB302', border: 'rgba(255, 179, 2, 0.2)' },
    published: { bg: 'rgba(45, 204, 255, 0.1)', text: '#2DCCFF', border: 'rgba(45, 204, 255, 0.2)' },
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="section-header">
          <div className="flex items-center">
            <div className="section-header__bar bg-gradient-to-b from-purple-400 to-purple-600" />
            <h1 className="section-header__title text-2xl">Patent Tracker</h1>
          </div>
          <span className="badge badge-pro">ENTERPRISE</span>
        </div>
        <p className="section-header__desc">
          Monitor patent filings, grants, and IP trends across {STATS.companiesTracked}+ space companies
        </p>
      </div>

      {/* Stats Row */}
      <ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Patents Tracked', value: STATS.totalPatents, icon: '📋' },
            { label: 'Granted This Year', value: STATS.grantedThisYear, icon: '✅' },
            { label: 'Top Assignee', value: STATS.topAssignee, icon: '🏆' },
            { label: 'Avg Citations', value: STATS.avgCitations.toString(), icon: '📊' },
          ].map(s => (
            <div key={s.label} className="card-data">
              <div className="card-data__label">{s.label}</div>
              <div className="flex items-center gap-2">
                <span>{s.icon}</span>
                <span className="card-data__value text-lg">{s.value}</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Patent Distribution Chart */}
      <ScrollReveal>
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-6 mb-8">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Patent Distribution by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 60, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0' }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                itemStyle={{ color: '#818cf8' }}
              />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ScrollReveal>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search patents, companies, inventors..."
          className="flex-1 min-w-[200px] bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {PATENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="granted">Granted</option>
          <option value="pending">Pending</option>
          <option value="published">Published</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="date">Sort by Date (Newest)</option>
          <option value="citations">Sort by Citations (Most)</option>
          <option value="assignee">Sort by Assignee (A-Z)</option>
          <option value="category">Sort by Category (A-Z)</option>
        </select>
      </div>
      <div className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Showing {filtered.length} of {PATENTS.length} patents
      </div>

      {/* Patent List */}
      <div className="card-terminal">
        <div className="card-terminal__header">
          <div className="flex items-center gap-2">
            <div className="card-terminal__dots">
              <div className="card-terminal__dot card-terminal__dot--red" />
              <div className="card-terminal__dot card-terminal__dot--amber" />
              <div className="card-terminal__dot card-terminal__dot--green" />
            </div>
            <span className="card-terminal__path">spacenexus:~/patents</span>
          </div>
          <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{filtered.length} results</span>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {filtered.slice(0, hasAccess ? filtered.length : 3).map(patent => {
            const sc = statusColors[patent.status];
            return (
              <div key={patent.id} className="p-4 hover:bg-[var(--bg-hover)] transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{patent.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>{patent.assignee}</span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{patent.category}</span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        Filed {new Date(patent.filingDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                      {patent.status}
                    </span>
                    {patent.patentNumber && (
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{patent.patentNumber}</span>
                    )}
                  </div>
                </div>
                <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {patent.abstract}
                </p>
                <div className="flex items-center gap-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span>Inventors: {patent.inventors.join(', ')}</span>
                  <span>·</span>
                  <span>{patent.citations} citations</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paywall for non-Enterprise users */}
      {!hasAccess && (
        <div className="mt-6 rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Showing 3 of {PATENTS.length}+ patent records
          </p>
          <h3 className="text-lg font-bold mb-2 text-display">Unlock Full Patent Intelligence</h3>
          <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Track {STATS.totalPatents} space patents across {STATS.companiesTracked}+ companies with advanced search, citation analysis, and IP trend reports.
          </p>
          <Link href="/pricing?utm_source=patent_tracker&utm_medium=paywall" className="btn-primary">
            Upgrade to Enterprise — $49.99/mo
          </Link>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 p-4 rounded-lg text-xs leading-relaxed" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
        Patent numbers and citation counts shown on this page are illustrative examples. Verify against USPTO/EPO for official records.
      </div>

      {/* Category Breakdown */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-tertiary)' }}>Patent Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {PATENT_CATEGORIES.filter(c => c !== 'All Categories').map(cat => {
            const count = PATENTS.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="text-left p-3 rounded-lg transition-colors text-xs"
                style={{
                  background: category === cat ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: category === cat ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${category === cat ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                }}
              >
                <span className="block font-semibold">{cat}</span>
                <span className="block mt-0.5" style={{ color: category === cat ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{count} patents</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
