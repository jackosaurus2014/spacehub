'use client';

import { useState } from 'react';

// ############################################################################
// REGULATORY FILINGS - Types and Status Configs
// ############################################################################

type FilingStatus = 'granted' | 'pending' | 'denied' | 'dismissed' | 'amended' | 'active' | 'expired' | 'proposed' | 'final' | 'comment';

export interface FCCFiling { id: string; callSign?: string; fileNumber: string; applicant: string; filingType: string; band: string; orbitType: 'NGSO' | 'GSO' | 'HEO' | 'MEO'; status: FilingStatus; dateFiled: string; dateActedOn?: string; satelliteCount?: number; summary: string; docket?: string; }
export interface FAALicense { id: string; licenseNumber: string; licensee: string; licenseType: 'Launch' | 'Reentry' | 'Launch Site' | 'Launch/Reentry'; vehicle: string; launchSite: string; status: FilingStatus; dateIssued: string; expirationDate: string; missionsAuthorized: number; summary: string; }
export interface ITUFiling { id: string; networkName: string; administration: string; filingType: 'AP30/30A' | 'AP30B' | 'Art.9 Coordination' | 'Art.11 Notification' | 'Due Diligence'; serviceBand: string; orbitType: 'GSO' | 'NGSO' | 'HEO' | 'MEO'; status: FilingStatus; dateFiled: string; satellites?: number; summary: string; }
export interface SECFiling { id: string; company: string; ticker: string; filingType: '10-K' | '10-Q' | '8-K' | 'S-1' | 'DEF 14A' | '13F' | 'SC 13D'; dateFiled: string; period?: string; summary: string; keyMetric?: string; keyMetricLabel?: string; url: string; }
export interface FederalRegisterEntry { id: string; agency: string; title: string; documentType: 'Proposed Rule' | 'Final Rule' | 'Notice' | 'Presidential Document' | 'Request for Comment'; federalRegisterNumber: string; publishedDate: string; commentDeadline?: string; effectiveDate?: string; impact: 'high' | 'medium' | 'low'; summary: string; docket?: string; }

const FILING_STATUS_STYLES: Record<FilingStatus, { label: string; bg: string; text: string }> = {
  granted: { label: 'Granted', bg: 'bg-green-500/20', text: 'text-green-400' },
  pending: { label: 'Pending', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  denied: { label: 'Denied', bg: 'bg-red-500/20', text: 'text-red-400' },
  dismissed: { label: 'Dismissed', bg: 'bg-slate-500/20', text: 'text-slate-400' },
  amended: { label: 'Amended', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  active: { label: 'Active', bg: 'bg-green-500/20', text: 'text-green-400' },
  expired: { label: 'Expired', bg: 'bg-slate-500/20', text: 'text-slate-400' },
  proposed: { label: 'Proposed', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  final: { label: 'Final Rule', bg: 'bg-green-500/20', text: 'text-green-400' },
  comment: { label: 'Open for Comment', bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
};
const DEFAULT_FILING_STATUS_STYLE = { label: 'Unknown', bg: 'bg-slate-500/20', text: 'text-slate-400' };

const FILING_IMPACT_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
};
const DEFAULT_FILING_IMPACT_STYLE = { bg: 'bg-slate-500/20', text: 'text-slate-400' };

const FILING_ORBIT_STYLES: Record<string, { bg: string; text: string }> = {
  NGSO: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  GSO: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  HEO: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  MEO: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
};
const DEFAULT_FILING_ORBIT_STYLE = { bg: 'bg-slate-500/20', text: 'text-slate-400' };

// ############################################################################
// TAB COMPONENTS
// ############################################################################

function FilingsFCCTab({ filings }: { filings: FCCFiling[] }) {
  const [search, setSearch] = useState(''); const [orbitFilter, setOrbitFilter] = useState(''); const [statusFilter, setStatusFilter] = useState('');
  const filtered = filings.filter((f) => { if (orbitFilter && f.orbitType !== orbitFilter) return false; if (statusFilter && f.status !== statusFilter) return false; if (search) { const s = search.toLowerCase(); return f.applicant.toLowerCase().includes(s) || f.fileNumber.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s) || f.band.toLowerCase().includes(s); } return true; });
  const uniqueStatuses = Array.from(new Set(filings.map((f) => f.status))); const uniqueOrbits = Array.from(new Set(filings.map((f) => f.orbitType))); const totalSats = filings.reduce((sum, f) => sum + (f.satelliteCount || 0), 0);
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{filings.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Filings</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{filings.filter((f) => f.status === 'granted').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Granted</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{filings.filter((f) => f.status === 'pending').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Pending</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-cyan-400">{totalSats.toLocaleString()}</div><div className="text-star-300 text-xs uppercase tracking-widest">Satellites Filed</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search applicant, file number, band..." aria-label="Search FCC filings" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
        <select value={orbitFilter} onChange={(e) => setOrbitFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Orbits</option>{uniqueOrbits.map((o) => (<option key={o} value={o}>{o}</option>))}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Statuses</option>{uniqueStatuses.map((s) => (<option key={s} value={s}>{(FILING_STATUS_STYLES[s] || DEFAULT_FILING_STATUS_STYLE).label}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} filings</span>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((filing) => { const statusStyle = FILING_STATUS_STYLES[filing.status] || DEFAULT_FILING_STATUS_STYLE; const orbitStyle = FILING_ORBIT_STYLES[filing.orbitType] || DEFAULT_FILING_ORBIT_STYLE; return (
        <div key={filing.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-base">{filing.applicant}</h4><span className="text-star-300 text-xs font-mono">{filing.fileNumber}</span></div><div className="flex items-center gap-2 shrink-0"><span className={`text-xs font-medium px-2 py-1 rounded ${orbitStyle.bg} ${orbitStyle.text}`}>{filing.orbitType}</span><span className={`text-xs font-medium px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span></div></div>
          <div className="flex items-center gap-4 mb-3 text-sm"><div><span className="text-star-300 text-xs block">Type</span><span className="text-white text-sm">{filing.filingType}</span></div><div><span className="text-star-300 text-xs block">Band</span><span className="text-nebula-300 text-sm font-mono">{filing.band}</span></div>{filing.satelliteCount && (<div><span className="text-star-300 text-xs block">Satellites</span><span className="text-white text-sm font-bold">{filing.satelliteCount.toLocaleString()}</span></div>)}</div>
          <p className="text-star-300 text-sm leading-relaxed mb-3">{filing.summary}</p>
          <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10"><span>Filed: <span className="text-white font-medium">{filing.dateFiled}</span></span>{filing.dateActedOn && (<><span className="text-white/20">|</span><span>Acted: <span className="text-white font-medium">{filing.dateActedOn}</span></span></>)}{filing.docket && (<><span className="text-white/20">|</span><span className="text-nebula-300 font-mono">{filing.docket}</span></>)}</div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No filings match your search</h3><button onClick={() => { setSearch(''); setOrbitFilter(''); setStatusFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function FilingsFAATab({ licenses }: { licenses: FAALicense[] }) {
  const [search, setSearch] = useState(''); const [typeFilter, setTypeFilter] = useState(''); const [statusFilter, setStatusFilter] = useState('');
  const filtered = licenses.filter((l) => { if (typeFilter && l.licenseType !== typeFilter) return false; if (statusFilter && l.status !== statusFilter) return false; if (search) { const s = search.toLowerCase(); return l.licensee.toLowerCase().includes(s) || l.vehicle.toLowerCase().includes(s) || l.launchSite.toLowerCase().includes(s) || l.licenseNumber.toLowerCase().includes(s); } return true; });
  const uniqueTypes = Array.from(new Set(licenses.map((l) => l.licenseType))); const uniqueStatuses = Array.from(new Set(licenses.map((l) => l.status))); const totalMissions = licenses.reduce((sum, l) => sum + l.missionsAuthorized, 0);
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{licenses.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Licenses</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{licenses.filter((l) => l.status === 'active').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Active</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{licenses.filter((l) => l.status === 'pending').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Pending</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-cyan-400">{totalMissions}</div><div className="text-star-300 text-xs uppercase tracking-widest">Missions Auth.</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search licensee, vehicle, launch site..." aria-label="Search FAA licenses" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Statuses</option>{uniqueStatuses.map((s) => (<option key={s} value={s}>{(FILING_STATUS_STYLES[s] || DEFAULT_FILING_STATUS_STYLE).label}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} licenses</span>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((license) => { const statusStyle = FILING_STATUS_STYLES[license.status] || DEFAULT_FILING_STATUS_STYLE; return (
        <div key={license.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-base">{license.licensee}</h4><span className="text-star-300 text-xs font-mono">{license.licenseNumber}</span></div><div className="flex items-center gap-2 shrink-0"><span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-400">{license.licenseType}</span><span className={`text-xs font-medium px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span></div></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3"><div><span className="text-star-300 text-xs block">Vehicle</span><span className="text-white text-sm font-medium">{license.vehicle}</span></div><div><span className="text-star-300 text-xs block">Launch Site</span><span className="text-nebula-300 text-sm">{license.launchSite}</span></div>{license.missionsAuthorized > 0 && (<div><span className="text-star-300 text-xs block">Missions</span><span className="text-white text-sm font-bold">{license.missionsAuthorized}</span></div>)}</div>
          <p className="text-star-300 text-sm leading-relaxed mb-3">{license.summary}</p>
          <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10"><span>Issued: <span className="text-white font-medium">{license.dateIssued}</span></span><span className="text-white/20">|</span><span>Expires: <span className="text-white font-medium">{license.expirationDate}</span></span></div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No licenses match your search</h3><button onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function FilingsITUTab({ filings }: { filings: ITUFiling[] }) {
  const [search, setSearch] = useState(''); const [orbitFilter, setOrbitFilter] = useState(''); const [typeFilter, setTypeFilter] = useState('');
  const filtered = filings.filter((f) => { if (orbitFilter && f.orbitType !== orbitFilter) return false; if (typeFilter && f.filingType !== typeFilter) return false; if (search) { const s = search.toLowerCase(); return f.networkName.toLowerCase().includes(s) || f.administration.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s); } return true; });
  const uniqueTypes = Array.from(new Set(filings.map((f) => f.filingType))); const uniqueOrbits = Array.from(new Set(filings.map((f) => f.orbitType))); const totalSats = filings.reduce((sum, f) => sum + (f.satellites || 0), 0);
  return (
    <div>
      <div className="card p-5 mb-6 border border-purple-500/20"><h3 className="text-white font-semibold mb-2">ITU Radio Regulations Filings</h3><p className="text-star-300 text-sm leading-relaxed">Satellite network filings under the ITU Radio Regulations. Includes Article 9 coordination requests, Appendix 30/30A/30B plan filings, Article 11 notifications, and due diligence submissions.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{filings.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Network Filings</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-purple-400">{Array.from(new Set(filings.map((f) => f.administration))).length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Administrations</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-cyan-400">{totalSats.toLocaleString()}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Satellites</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{filings.filter((f) => f.status === 'active').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Active Filings</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search network name, administration..." aria-label="Search ITU filings" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
        <select value={orbitFilter} onChange={(e) => setOrbitFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Orbits</option>{uniqueOrbits.map((o) => (<option key={o} value={o}>{o}</option>))}</select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Filing Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} filings</span>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((filing) => { const statusStyle = FILING_STATUS_STYLES[filing.status] || DEFAULT_FILING_STATUS_STYLE; const orbitStyle = FILING_ORBIT_STYLES[filing.orbitType] || DEFAULT_FILING_ORBIT_STYLE; return (
        <div key={filing.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-base font-mono">{filing.networkName}</h4><span className="text-star-300 text-sm">{filing.administration}</span></div><div className="flex items-center gap-2 shrink-0"><span className={`text-xs font-medium px-2 py-1 rounded ${orbitStyle.bg} ${orbitStyle.text}`}>{filing.orbitType}</span><span className={`text-xs font-medium px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span></div></div>
          <div className="flex items-center gap-4 mb-3 text-sm"><div><span className="text-star-300 text-xs block">Filing Type</span><span className="text-white text-sm">{filing.filingType}</span></div><div><span className="text-star-300 text-xs block">Service Band</span><span className="text-nebula-300 text-sm font-mono">{filing.serviceBand}</span></div>{filing.satellites && (<div><span className="text-star-300 text-xs block">Satellites</span><span className="text-white text-sm font-bold">{filing.satellites.toLocaleString()}</span></div>)}</div>
          <p className="text-star-300 text-sm leading-relaxed mb-3">{filing.summary}</p>
          <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10"><span>Filed: <span className="text-white font-medium">{filing.dateFiled}</span></span></div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No filings match your search</h3><button onClick={() => { setSearch(''); setOrbitFilter(''); setTypeFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function FilingsSECTab({ filings }: { filings: SECFiling[] }) {
  const [search, setSearch] = useState(''); const [typeFilter, setTypeFilter] = useState(''); const [companyFilter, setCompanyFilter] = useState('');
  const filtered = filings.filter((f) => { if (typeFilter && f.filingType !== typeFilter) return false; if (companyFilter && f.ticker !== companyFilter) return false; if (search) { const s = search.toLowerCase(); return f.company.toLowerCase().includes(s) || f.ticker.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s); } return true; });
  const uniqueTypes = Array.from(new Set(filings.map((f) => f.filingType))); const uniqueTickers = Array.from(new Set(filings.map((f) => f.ticker)));
  const filingTypeColors: Record<string, { bg: string; text: string }> = { '10-K': { bg: 'bg-blue-500/20', text: 'text-blue-400' }, '10-Q': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' }, '8-K': { bg: 'bg-orange-500/20', text: 'text-orange-400' }, 'S-1': { bg: 'bg-green-500/20', text: 'text-green-400' }, 'DEF 14A': { bg: 'bg-purple-500/20', text: 'text-purple-400' }, '13F': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' }, 'SC 13D': { bg: 'bg-red-500/20', text: 'text-red-400' } };
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{filings.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Filings</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-blue-400">{filings.filter((f) => f.filingType === '10-K').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Annual Reports</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-orange-400">{filings.filter((f) => f.filingType === '8-K').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Current Reports</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-purple-400">{uniqueTickers.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Companies</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search company, ticker, content..." aria-label="Search SEC filings" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Companies</option>{uniqueTickers.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Filing Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} filings</span>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((filing) => { const typeColor = filingTypeColors[filing.filingType] || { bg: 'bg-slate-500/20', text: 'text-slate-400' }; return (
        <div key={filing.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-base">{filing.company}</h4><div className="flex items-center gap-2 mt-1"><span className="text-nebula-300 text-sm font-bold font-mono">${filing.ticker}</span>{filing.period && (<span className="text-star-300 text-xs">({filing.period})</span>)}</div></div><span className={`text-xs font-medium px-2.5 py-1 rounded ${typeColor.bg} ${typeColor.text}`}>{filing.filingType}</span></div>
          {filing.keyMetric && (<div className="flex items-center gap-4 mb-3"><div className="card-elevated px-4 py-2 rounded-lg"><span className="text-star-300 text-xs block">{filing.keyMetricLabel}</span><span className="text-white text-lg font-bold font-display">{filing.keyMetric}</span></div></div>)}
          <p className="text-star-300 text-sm leading-relaxed mb-3">{filing.summary}</p>
          <div className="flex items-center justify-between text-xs text-star-300 pt-3 border-t border-white/10"><span>Filed: <span className="text-white font-medium">{filing.dateFiled}</span></span><a href={filing.url} target="_blank" rel="noopener noreferrer" className="text-nebula-300 hover:text-white transition-colors">View on EDGAR</a></div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No filings match your search</h3><button onClick={() => { setSearch(''); setTypeFilter(''); setCompanyFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function FilingsFederalRegisterTab({ entries }: { entries: FederalRegisterEntry[] }) {
  const [search, setSearch] = useState(''); const [agencyFilter, setAgencyFilter] = useState(''); const [typeFilter, setTypeFilter] = useState(''); const [impactFilter, setImpactFilter] = useState('');
  const filtered = entries.filter((e) => { if (agencyFilter && e.agency !== agencyFilter) return false; if (typeFilter && e.documentType !== typeFilter) return false; if (impactFilter && e.impact !== impactFilter) return false; if (search) { const s = search.toLowerCase(); return e.title.toLowerCase().includes(s) || e.agency.toLowerCase().includes(s) || e.summary.toLowerCase().includes(s); } return true; });
  const uniqueAgencies = Array.from(new Set(entries.map((e) => e.agency))); const uniqueTypes = Array.from(new Set(entries.map((e) => e.documentType)));
  const docTypeColors: Record<string, { bg: string; text: string }> = { 'Proposed Rule': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' }, 'Final Rule': { bg: 'bg-green-500/20', text: 'text-green-400' }, 'Notice': { bg: 'bg-blue-500/20', text: 'text-blue-400' }, 'Presidential Document': { bg: 'bg-purple-500/20', text: 'text-purple-400' }, 'Request for Comment': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' } };
  const openForComment = entries.filter((e) => { if (!e.commentDeadline) return false; return new Date(e.commentDeadline) > new Date(); });
  return (
    <div>
      {openForComment.length > 0 && (<div className="card p-5 mb-6 border border-yellow-500/30 bg-yellow-500/5"><h3 className="text-yellow-400 font-semibold mb-3">Open Comment Periods</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{openForComment.map((entry) => (<div key={entry.id} className="card p-3"><div className="flex items-center justify-between mb-1"><span className="text-xs font-bold text-nebula-300">{entry.agency}</span><span className="text-xs text-yellow-400">Due: {entry.commentDeadline}</span></div><p className="text-sm text-white line-clamp-2">{entry.title}</p></div>))}</div></div>)}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{entries.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Entries</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{entries.filter((e) => e.documentType === 'Final Rule').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Final Rules</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{entries.filter((e) => e.documentType === 'Proposed Rule').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Proposed Rules</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-red-400">{entries.filter((e) => e.impact === 'high').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">High Impact</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="text" placeholder="Search title, agency, content..." aria-label="Search Federal Register entries" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Agencies</option>{uniqueAgencies.map((a) => (<option key={a} value={a}>{a}</option>))}</select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={impactFilter} onChange={(e) => setImpactFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Impact Levels</option><option value="high">High Impact</option><option value="medium">Medium Impact</option><option value="low">Low Impact</option></select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} entries</span>
      </div></div>
      <div className="space-y-4">{filtered.map((entry) => { const typeColor = docTypeColors[entry.documentType] || { bg: 'bg-slate-500/20', text: 'text-slate-400' }; const impactStyle = FILING_IMPACT_STYLES[entry.impact] || DEFAULT_FILING_IMPACT_STYLE; return (
        <div key={entry.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-nebula-300 shrink-0">{entry.agency}</div><div><h4 className="font-semibold text-white text-base">{entry.title}</h4><span className="text-star-300 text-xs font-mono">FR {entry.federalRegisterNumber}</span></div></div><div className="flex items-center gap-2 shrink-0"><span className={`text-xs font-medium px-2 py-1 rounded ${typeColor.bg} ${typeColor.text}`}>{entry.documentType}</span><span className={`text-xs font-medium px-2 py-1 rounded ${impactStyle.bg} ${impactStyle.text}`}>{entry.impact.charAt(0).toUpperCase() + entry.impact.slice(1)} Impact</span></div></div>
          <p className="text-star-300 text-sm leading-relaxed mb-3">{entry.summary}</p>
          <div className="flex items-center flex-wrap gap-4 text-xs text-star-300 pt-3 border-t border-white/10"><span>Published: <span className="text-white font-medium">{entry.publishedDate}</span></span>{entry.effectiveDate && (<><span className="text-white/20">|</span><span>Effective: <span className="text-white font-medium">{entry.effectiveDate}</span></span></>)}{entry.commentDeadline && (<><span className="text-white/20">|</span><span className={new Date(entry.commentDeadline) > new Date() ? 'text-yellow-400 font-semibold' : 'text-star-300'}>Comments Due: {entry.commentDeadline}</span></>)}{entry.docket && (<><span className="text-white/20">|</span><span className="text-nebula-300 font-mono">{entry.docket}</span></>)}</div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No entries match your search</h3><button onClick={() => { setSearch(''); setAgencyFilter(''); setTypeFilter(''); setImpactFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

// ############################################################################
// MAIN EXPORT
// ############################################################################

export interface FilingsSectionProps {
  activeSubTab: string;
  fccFilings: FCCFiling[];
  faaLicenses: FAALicense[];
  ituFilings: ITUFiling[];
  secFilings: SECFiling[];
  federalRegisterEntries: FederalRegisterEntry[];
}

export default function FilingsSection({ activeSubTab, fccFilings, faaLicenses, ituFilings, secFilings, federalRegisterEntries }: FilingsSectionProps) {
  return (
    <>
      {activeSubTab === 'fcc' && <FilingsFCCTab filings={fccFilings} />}
      {activeSubTab === 'faa' && <FilingsFAATab licenses={faaLicenses} />}
      {activeSubTab === 'itu' && <FilingsITUTab filings={ituFilings} />}
      {activeSubTab === 'sec' && <FilingsSECTab filings={secFilings} />}
      {activeSubTab === 'federal-register' && <FilingsFederalRegisterTab entries={federalRegisterEntries} />}
    </>
  );
}
