'use client';

import { useState, useMemo } from 'react';

// ############################################################################
// SPACE LAW - Types and Status Configs
// ############################################################################

type TreatyStatus = 'in_force' | 'open' | 'not_in_force';
type NationalLawStatus = 'enacted' | 'amended' | 'proposed' | 'under_review';
type ArtemisStatus = 'signatory' | 'implementing' | 'observer';
type ProceedingStatus = 'active' | 'resolved' | 'pending' | 'advisory';
type BodyType = 'un' | 'national' | 'regional' | 'industry';

export interface Treaty {
  id: string; name: string; fullName: string; adoptedYear: number; entryIntoForceYear: number;
  status: TreatyStatus; ratifications: number; signatories: number; depositary: string;
  keyProvisions: string[]; description: string; significance: string;
}

export interface NationalLaw {
  id: string; country: string; countryCode: string; lawName: string; year: number;
  status: NationalLawStatus; agency: string; keyFeatures: string[]; description: string; scope: string;
}

export interface ArtemisSignatory {
  id: string; country: string; countryCode: string; dateSigned: string; region: string;
  spaceAgency: string; implementationStatus: ArtemisStatus; notes: string;
}

export interface LegalProceeding {
  id: string; title: string; type: string; parties: string; status: ProceedingStatus;
  year: number; jurisdiction: string; description: string; significance: string; outcome: string;
}

export interface RegulatoryBody {
  id: string; name: string; abbreviation: string; type: BodyType; headquarters: string;
  established: number; members: string; mandate: string; keyFunctions: string[]; website: string;
}

const TREATY_STATUS_CONFIG: Record<TreatyStatus, { label: string; bg: string; text: string; border: string }> = {
  in_force: { label: 'In Force', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  open: { label: 'Open for Signature', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  not_in_force: { label: 'Not Widely Ratified', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};
const DEFAULT_TREATY_STATUS = { label: 'Unknown', bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };

const NATIONAL_STATUS_CONFIG: Record<NationalLawStatus, { label: string; bg: string; text: string; border: string }> = {
  enacted: { label: 'Enacted', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  amended: { label: 'Amended', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  proposed: { label: 'Proposed', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  under_review: { label: 'Under Review', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
};
const DEFAULT_NATIONAL_STATUS = { label: 'Unknown', bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };

const ARTEMIS_STATUS_CONFIG: Record<ArtemisStatus, { label: string; bg: string; text: string; border: string }> = {
  signatory: { label: 'Signatory', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  implementing: { label: 'Implementing', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  observer: { label: 'Observer', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};
const DEFAULT_ARTEMIS_STATUS = { label: 'Unknown', bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };

const PROCEEDING_STATUS_CONFIG: Record<ProceedingStatus, { label: string; bg: string; text: string; border: string }> = {
  active: { label: 'Active', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  resolved: { label: 'Resolved', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  pending: { label: 'Pending', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  advisory: { label: 'Advisory', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
};
const DEFAULT_PROCEEDING_STATUS = { label: 'Unknown', bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };

const BODY_TYPE_CONFIG: Record<BodyType, { label: string; bg: string; text: string; border: string }> = {
  un: { label: 'UN Body', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  national: { label: 'National', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  regional: { label: 'Regional', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  industry: { label: 'Industry', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
};
const DEFAULT_BODY_TYPE = { label: 'Unknown', bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };

// ############################################################################
// CARD COMPONENTS
// ############################################################################

function TreatyCard({ treaty }: { treaty: Treaty }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = TREATY_STATUS_CONFIG[treaty.status] || DEFAULT_TREATY_STATUS;
  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0"><h4 className="font-semibold text-slate-900 text-lg">{treaty.name}</h4><p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{treaty.fullName}</p></div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ml-3 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>{statusConfig.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-slate-100 font-bold text-xl">{treaty.ratifications}</div><div className="text-slate-400 text-xs">Ratifications</div></div>
        <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-slate-100 font-bold text-xl">{treaty.signatories}</div><div className="text-slate-400 text-xs">Signatories</div></div>
        <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-slate-100 font-bold text-xl">{treaty.entryIntoForceYear}</div><div className="text-slate-400 text-xs">In Force</div></div>
      </div>
      <p className="text-slate-500 text-sm mb-3 line-clamp-3">{treaty.description}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors">{expanded ? 'Show Less' : 'View Key Provisions'}</button>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-3">
          <div><h5 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Key Provisions</h5><ul className="space-y-1.5">{treaty.keyProvisions.map((provision, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-500"><span className="text-cyan-400 mt-0.5 flex-shrink-0">*</span>{provision}</li>))}</ul></div>
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Significance</h5><p className="text-xs text-slate-500">{treaty.significance}</p></div>
          <div className="text-xs text-slate-400">Adopted: {treaty.adoptedYear} | Depositary: {treaty.depositary}</div>
        </div>
      )}
    </div>
  );
}

function NationalLawCard({ law }: { law: NationalLaw }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = NATIONAL_STATUS_CONFIG[law.status] || DEFAULT_NATIONAL_STATUS;
  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-600/40 flex items-center justify-center text-sm font-bold text-slate-600">{law.countryCode}</div>
          <div><h4 className="font-semibold text-slate-900">{law.country}</h4><span className="text-slate-400 text-xs">{law.agency}</span></div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>{statusConfig.label}</span>
      </div>
      <h5 className="text-sm font-medium text-nebula-300 mb-1">{law.lawName}</h5>
      <div className="flex items-center gap-3 text-xs text-slate-400 mb-3"><span>Year: {law.year}</span><span>Scope: {law.scope}</span></div>
      <p className="text-slate-500 text-sm mb-3 line-clamp-2">{law.description}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors">{expanded ? 'Show Less' : 'View Key Features'}</button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/50"><h5 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Key Features</h5><ul className="space-y-1.5">{law.keyFeatures.map((feature, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-500"><svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{feature}</li>))}</ul></div>
      )}
    </div>
  );
}

function ProceedingCard({ proceeding }: { proceeding: LegalProceeding }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = PROCEEDING_STATUS_CONFIG[proceeding.status] || DEFAULT_PROCEEDING_STATUS;
  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-2"><div className="flex items-center gap-2"><span className="text-xs text-slate-400 bg-slate-800/50 border border-slate-600/40 px-2 py-0.5 rounded font-medium">{proceeding.type}</span><span className="text-xs text-slate-400">{proceeding.year}</span></div><span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>{statusConfig.label}</span></div>
      <h4 className="font-semibold text-slate-900 mb-1">{proceeding.title}</h4><p className="text-xs text-slate-400 mb-3">{proceeding.parties}</p>
      <p className="text-slate-500 text-sm mb-3 line-clamp-3">{proceeding.description}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors">{expanded ? 'Show Less' : 'View Details'}</button>
      {expanded && (<div className="mt-3 pt-3 border-t border-slate-200/50 space-y-3"><div><h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Jurisdiction</h5><p className="text-xs text-slate-500">{proceeding.jurisdiction}</p></div><div><h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Significance</h5><p className="text-xs text-slate-500">{proceeding.significance}</p></div><div><h5 className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Outcome</h5><p className="text-xs text-slate-500">{proceeding.outcome}</p></div></div>)}
    </div>
  );
}

function BodyCard({ body }: { body: RegulatoryBody }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = BODY_TYPE_CONFIG[body.type] || DEFAULT_BODY_TYPE;
  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-3"><div><div className="flex items-center gap-2 mb-1"><h4 className="font-semibold text-slate-900">{body.abbreviation}</h4><span className={`text-xs px-2 py-0.5 rounded border ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border}`}>{typeConfig.label}</span></div><p className="text-slate-400 text-sm">{body.name}</p></div></div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3"><span>Est. {body.established}</span><span>{body.headquarters}</span><span>{body.members}</span></div>
      <p className="text-slate-500 text-sm mb-3 line-clamp-2">{body.mandate}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors">{expanded ? 'Show Less' : 'View Functions'}</button>
      {expanded && (<div className="mt-3 pt-3 border-t border-slate-200/50"><h5 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Key Functions</h5><ul className="space-y-1.5">{body.keyFunctions.map((func, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-500"><svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{func}</li>))}</ul><a href={body.website} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-nebula-300 hover:text-nebula-200">Visit Website</a></div>)}
    </div>
  );
}

// ############################################################################
// TAB COMPONENTS
// ############################################################################

function SpaceLawTreatiesTab({ treaties }: { treaties: Treaty[] }) {
  return (
    <div>
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-blue-400 mb-2">United Nations Space Treaty Framework</h4><p className="text-sm text-slate-400">Five core UN treaties form the foundation of international space law. The Outer Space Treaty (1967) serves as the cornerstone, with four supplementary treaties addressing specific aspects of space activities.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{treaties.map((treaty) => (<TreatyCard key={treaty.id} treaty={treaty} />))}</div>
      <div className="card p-5 border-dashed mt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Treaty Ratification Overview</h3>
        <div className="space-y-3">{treaties.map((treaty) => { const maxRatifications = 114; const pct = (treaty.ratifications / maxRatifications) * 100; return (<div key={treaty.id}><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-600 font-medium">{treaty.name}</span><span className="text-sm text-slate-400">{treaty.ratifications} ratifications</span></div><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${treaty.status === 'not_in_force' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-gradient-to-r from-cyan-500 to-blue-400'}`} style={{ width: `${pct}%` }} /></div></div>); })}</div>
        <p className="text-xs text-slate-400 mt-4">Data based on UNOOSA treaty status reports. Signatories that have not ratified are counted separately.</p>
      </div>
    </div>
  );
}

function SpaceLawNationalTab({ nationalLaws }: { nationalLaws: NationalLaw[] }) {
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const countries = useMemo(() => Array.from(new Set(nationalLaws.map(l => l.country))).sort(), [nationalLaws]);
  const filteredLaws = useMemo(() => { let result = [...nationalLaws]; if (countryFilter) result = result.filter(l => l.country === countryFilter); if (statusFilter) result = result.filter(l => l.status === statusFilter); return result; }, [nationalLaws, countryFilter, statusFilter]);
  return (
    <div>
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-cyan-600 mb-2">National Space Legislation Tracker</h4><p className="text-sm text-slate-400">As commercial space activities expand, nations are rapidly developing domestic legislation to regulate launches, satellite operations, space resources, and liability. This tracker monitors major national frameworks.</p></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div><label className="block text-slate-400 text-sm mb-1">Country</label><select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Countries</option>{countries.map(c => (<option key={c} value={c}>{c}</option>))}</select></div>
        <div><label className="block text-slate-400 text-sm mb-1">Status</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Statuses</option><option value="enacted">Enacted</option><option value="amended">Amended</option><option value="proposed">Proposed</option><option value="under_review">Under Review</option></select></div>
        {(countryFilter || statusFilter) && (<button onClick={() => { setCountryFilter(''); setStatusFilter(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="flex items-center justify-between mb-4"><span className="text-sm text-slate-400">Showing {filteredLaws.length} of {nationalLaws.length} laws</span></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{filteredLaws.map((law) => (<NationalLawCard key={law.id} law={law} />))}</div>
    </div>
  );
}

function SpaceLawArtemisTab({ principles, signatories }: { principles: { title: string; description: string }[]; signatories: ArtemisSignatory[] }) {
  const [regionFilter, setRegionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const regions = useMemo(() => Array.from(new Set(signatories.map(s => s.region))).sort(), [signatories]);
  const filteredSignatories = useMemo(() => { let result = [...signatories]; if (regionFilter) result = result.filter(s => s.region === regionFilter); if (searchQuery) { const query = searchQuery.toLowerCase(); result = result.filter(s => s.country.toLowerCase().includes(query) || s.spaceAgency.toLowerCase().includes(query) || s.notes.toLowerCase().includes(query)); } return result; }, [signatories, regionFilter, searchQuery]);
  const regionCounts = useMemo(() => { const counts: Record<string, number> = {}; signatories.forEach(s => { counts[s.region] = (counts[s.region] || 0) + 1; }); return counts; }, [signatories]);
  return (
    <div>
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-slate-900 mb-2">About the Artemis Accords</h3><p className="text-slate-500 text-sm mb-4">The Artemis Accords are a set of bilateral agreements between the United States and partner nations, grounded in the Outer Space Treaty. Established in 2020 by NASA, they set principles for the responsible and peaceful exploration of the Moon, Mars, and other celestial bodies as part of the Artemis program.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-green-400">{signatories.length}</div><div className="text-slate-400 text-xs">Total Signatories</div></div>
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-cyan-400">{Object.keys(regionCounts).length}</div><div className="text-slate-400 text-xs">Regions</div></div>
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-400">{signatories.filter(s => s.implementationStatus === 'implementing').length}</div><div className="text-slate-400 text-xs">Implementing</div></div>
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-purple-400">{principles.length}</div><div className="text-slate-400 text-xs">Core Principles</div></div>
        </div>
      </div>
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-slate-900 mb-4">Core Principles</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{principles.map((principle, i) => (<div key={i} className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-4"><div className="flex items-center gap-2 mb-1"><span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-600 text-xs font-bold flex items-center justify-center">{i + 1}</span><h5 className="font-medium text-slate-900 text-sm">{principle.title}</h5></div><p className="text-xs text-slate-500 ml-8">{principle.description}</p></div>))}</div></div>
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-slate-900 mb-3">Regional Distribution</h3><div className="space-y-3">{Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).map(([region, count]) => { const maxCount = Math.max(...Object.values(regionCounts)); const pct = (count / maxCount) * 100; return (<div key={region}><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-600 font-medium">{region}</span><span className="text-sm text-slate-400">{count} signatories</span></div><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} /></div></div>); })}</div></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]"><label className="block text-slate-400 text-sm mb-1">Search</label><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search countries, agencies..." className="w-full bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400" /></div>
        <div><label className="block text-slate-400 text-sm mb-1">Region</label><select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Regions</option>{regions.map(r => (<option key={r} value={r}>{r} ({regionCounts[r]})</option>))}</select></div>
        {(regionFilter || searchQuery) && (<button onClick={() => { setRegionFilter(''); setSearchQuery(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="flex items-center justify-between mb-4"><span className="text-sm text-slate-400">Showing {filteredSignatories.length} of {signatories.length} signatories</span></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredSignatories.map((signatory) => { const status = ARTEMIS_STATUS_CONFIG[signatory.implementationStatus] || DEFAULT_ARTEMIS_STATUS; return (<div key={signatory.id} className="card p-4 hover:border-cyan-500/30 transition-all"><div className="flex items-start justify-between mb-2"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-600/40 flex items-center justify-center text-sm font-bold text-slate-600">{signatory.countryCode}</div><div><h4 className="font-semibold text-slate-900 text-sm">{signatory.country}</h4><span className="text-slate-400 text-xs">{signatory.spaceAgency}</span></div></div><span className={`text-xs px-2 py-0.5 rounded border ${status.bg} ${status.text} ${status.border}`}>{status.label}</span></div><div className="flex items-center gap-3 text-xs text-slate-400 mb-2"><span>Signed: {new Date(signatory.dateSigned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span><span>{signatory.region}</span></div><p className="text-xs text-slate-500 line-clamp-2">{signatory.notes}</p></div>); })}</div>
    </div>
  );
}

function SpaceLawProceedingsTab({ proceedings }: { proceedings: LegalProceeding[] }) {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const types = useMemo(() => Array.from(new Set(proceedings.map(p => p.type))).sort(), [proceedings]);
  const filteredProceedings = useMemo(() => { let result = [...proceedings]; if (typeFilter) result = result.filter(p => p.type === typeFilter); if (statusFilter) result = result.filter(p => p.status === statusFilter); return result.sort((a, b) => b.year - a.year); }, [proceedings, typeFilter, statusFilter]);
  return (
    <div>
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-red-400 mb-2">Space Law Cases and Legal Proceedings</h4><p className="text-sm text-slate-400">Tracking notable legal disputes, regulatory enforcement actions, and advisory opinions that shape the evolving body of space law. Includes both international and domestic proceedings.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-slate-900">{proceedings.length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Cases</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-red-400">{proceedings.filter(p => p.status === 'active').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Active</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{proceedings.filter(p => p.status === 'resolved').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Resolved</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{proceedings.filter(p => p.status === 'pending').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Pending</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div><label className="block text-slate-400 text-sm mb-1">Case Type</label><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Types</option>{types.map(t => (<option key={t} value={t}>{t}</option>))}</select></div>
        <div><label className="block text-slate-400 text-sm mb-1">Status</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Statuses</option><option value="active">Active</option><option value="resolved">Resolved</option><option value="pending">Pending</option><option value="advisory">Advisory</option></select></div>
        {(typeFilter || statusFilter) && (<button onClick={() => { setTypeFilter(''); setStatusFilter(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filteredProceedings.map((p) => (<ProceedingCard key={p.id} proceeding={p} />))}</div>
    </div>
  );
}

function SpaceLawBodiesTab({ bodies }: { bodies: RegulatoryBody[] }) {
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const filteredBodies = useMemo(() => { let result = [...bodies]; if (typeFilter) result = result.filter(b => b.type === typeFilter); if (searchQuery) { const query = searchQuery.toLowerCase(); result = result.filter(b => b.name.toLowerCase().includes(query) || b.abbreviation.toLowerCase().includes(query) || b.mandate.toLowerCase().includes(query) || b.headquarters.toLowerCase().includes(query)); } return result; }, [bodies, typeFilter, searchQuery]);
  return (
    <div>
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-purple-600 mb-2">Space Regulatory Bodies Directory</h4><p className="text-sm text-slate-400">Comprehensive directory of international, regional, and national regulatory bodies governing space activities. From UN organizations to national licensing authorities and industry coordination groups.</p></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]"><label className="block text-slate-400 text-sm mb-1">Search</label><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search bodies, functions..." className="w-full bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400" /></div>
        <div><label className="block text-slate-400 text-sm mb-1">Type</label><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Types</option><option value="un">UN Bodies</option><option value="national">National</option><option value="regional">Regional</option><option value="industry">Industry</option></select></div>
        {(typeFilter || searchQuery) && (<button onClick={() => { setTypeFilter(''); setSearchQuery(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{(Object.entries(BODY_TYPE_CONFIG) as [BodyType, typeof BODY_TYPE_CONFIG[BodyType]][]).map(([type, config]) => { const count = bodies.filter(b => b.type === type).length; return (<button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)} className={`card-elevated p-4 text-center transition-all cursor-pointer ${typeFilter === type ? 'ring-2 ring-nebula-500/50' : ''}`}><div className={`text-2xl font-bold font-display ${config.text}`}>{count}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">{config.label}</div></button>); })}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{filteredBodies.map((body) => (<BodyCard key={body.id} body={body} />))}</div>
    </div>
  );
}

// ############################################################################
// MAIN EXPORT
// ############################################################################

export interface SpaceLawSectionProps {
  activeSubTab: string;
  treaties: Treaty[];
  nationalLaws: NationalLaw[];
  artemisPrinciples: { title: string; description: string }[];
  artemisSignatories: ArtemisSignatory[];
  legalProceedings: LegalProceeding[];
  regulatoryBodies: RegulatoryBody[];
}

export default function SpaceLawSection({ activeSubTab, treaties, nationalLaws, artemisPrinciples, artemisSignatories, legalProceedings, regulatoryBodies }: SpaceLawSectionProps) {
  return (
    <>
      {activeSubTab === 'treaties' && <SpaceLawTreatiesTab treaties={treaties} />}
      {activeSubTab === 'national' && <SpaceLawNationalTab nationalLaws={nationalLaws} />}
      {activeSubTab === 'artemis' && <SpaceLawArtemisTab principles={artemisPrinciples} signatories={artemisSignatories} />}
      {activeSubTab === 'proceedings' && <SpaceLawProceedingsTab proceedings={legalProceedings} />}
      {activeSubTab === 'bodies' && <SpaceLawBodiesTab bodies={regulatoryBodies} />}
    </>
  );
}
