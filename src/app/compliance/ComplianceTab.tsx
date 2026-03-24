'use client';

import { useState } from 'react';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import {
  POLICY_CHANGES,
  LICENSE_REQUIREMENTS,
  SPACE_LAW_CASES,
  ECCN_CLASSIFICATIONS,
  USML_CATEGORIES,
  EXPERT_SOURCES,
  TREATY_OBLIGATIONS,
  getRegulatoryHubStats,
  getUpcomingDeadlines,
  type PolicyChange,
  type LicenseRequirement,
  type SpaceLawCase,
  type ECCNClassification,
  type USMLCategory,
  type ExpertSource,
  type TreatyObligation,
} from '@/lib/regulatory-hub-data';

// ############################################################################
// POLICY TRACKER
// ############################################################################

function PolicyCard({ policy }: { policy: PolicyChange }) {
  const severityColors = {
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const statusColors = {
    proposed: 'bg-blue-500/20 text-blue-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    effective: 'bg-green-500/20 text-green-400',
    final: 'bg-green-500/20 text-green-400',
    withdrawn: 'bg-white/[0.04] text-slate-400',
    superseded: 'bg-white/[0.04] text-slate-400',
  };
  const agencyIcons: Record<string, string> = {
    FAA: '\u2708\uFE0F', FCC: '\uD83D\uDCE1', NOAA: '\uD83C\uDF0A', BIS: '\uD83D\uDCE6', DDTC: '\uD83D\uDD12', NASA: '\uD83D\uDE80', DOD: '\uD83C\uDF96\uFE0F', DOS: '\uD83C\uDFDB\uFE0F',
  };
  const deadline = policy.commentDeadline ? new Date(policy.commentDeadline) : null;
  const isUrgent = deadline && deadline > new Date() && deadline < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return (
    <div className="card p-5 hover:border-white/15 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{agencyIcons[policy.agency] || '\uD83D\uDCCB'}</span>
          <span className="text-xs font-bold text-white/90 bg-white/[0.08] px-2 py-1 rounded">{policy.agency}</span>
          <span className={`text-xs px-2 py-1 rounded ${statusColors[policy.status]}`}>{policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded border ${severityColors[policy.impactSeverity]}`}>{policy.impactSeverity.toUpperCase()} Impact</span>
      </div>
      <h4 className="font-semibold text-white mb-2">{policy.title}</h4>
      <p className="text-slate-400 text-sm mb-3 line-clamp-3">{policy.summary}</p>
      <div className="bg-white/[0.04] rounded-lg p-3 mb-3">
        <h5 className="text-xs font-semibold text-slate-300 mb-1">Impact Analysis</h5>
        <p className="text-xs text-slate-400 line-clamp-2">{policy.impactAnalysis}</p>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {policy.affectedParties.slice(0, 3).map((party, i) => (
          <span key={i} className="text-xs bg-white/10 text-white/90 px-2 py-0.5 rounded">{party.replace(/_/g, ' ')}</span>
        ))}
        {policy.affectedParties.length > 3 && (<span className="text-xs text-slate-400">+{policy.affectedParties.length - 3} more</span>)}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{policy.federalRegisterCitation || `Published: ${new Date(policy.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}`}</span>
        {deadline && (<span className={`${isUrgent ? 'text-yellow-500 font-semibold' : 'text-slate-400'}`}>{isUrgent && '\u26A0\uFE0F '}Comments due: {deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>)}
      </div>
      <a href={policy.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-white/90 hover:text-white mt-3">View Full Policy &rarr;</a>
    </div>
  );
}

export function PolicyTrackerTab() {
  const [agencyFilter, setAgencyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filteredPolicies = POLICY_CHANGES.filter(p => { if (agencyFilter && p.agency !== agencyFilter) return false; if (statusFilter && p.status !== statusFilter) return false; return true; });
  const upcomingDeadlines = getUpcomingDeadlines(90);
  return (
    <div>
      {upcomingDeadlines.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-yellow-400 mb-2">Upcoming Regulatory Deadlines</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingDeadlines.slice(0, 3).map((d, i) => (
              <div key={i} className="bg-white/[0.04] rounded p-3 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-400">{d.policy.agency}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${d.deadlineType === 'comment' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>{d.deadlineType === 'comment' ? 'Comment Deadline' : 'Effective Date'}</span>
                </div>
                <p className="text-sm text-white/90 line-clamp-1">{d.policy.title}</p>
                <p className="text-xs text-slate-400 mt-1">{d.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none">
          <option value="">All Agencies</option><option value="FAA">FAA (Launches)</option><option value="FCC">FCC (Spectrum)</option><option value="NOAA">NOAA (Remote Sensing)</option><option value="BIS">BIS (Export Controls)</option><option value="DDTC">DDTC (ITAR)</option><option value="NASA">NASA</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none">
          <option value="">All Statuses</option><option value="proposed">Proposed</option><option value="pending">Pending</option><option value="effective">Effective</option><option value="final">Final</option>
        </select>
        <div className="ml-auto">
          <ExportButton data={filteredPolicies} filename="policy-tracker" columns={[{ key: 'agency', label: 'Agency' },{ key: 'title', label: 'Title' },{ key: 'status', label: 'Status' },{ key: 'impactSeverity', label: 'Impact' },{ key: 'summary', label: 'Summary' },{ key: 'publishedDate', label: 'Published' },{ key: 'sourceUrl', label: 'Source' }]} />
        </div>
      </div>
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filteredPolicies.map((policy) => (<StaggerItem key={policy.id}><PolicyCard policy={policy} /></StaggerItem>))}</StaggerContainer>
    </div>
  );
}

// ############################################################################
// COMPLIANCE WIZARD
// ############################################################################

function LicenseCard({ license }: { license: LicenseRequirement }) {
  const [expanded, setExpanded] = useState(false);
  const agencyColors: Record<string, string> = { FAA: 'bg-orange-500/20 text-orange-400 border-orange-500/30', FCC: 'bg-blue-500/20 text-blue-400 border-blue-500/30', NOAA: 'bg-white/10 text-slate-300 border-white/10' };
  return (
    <div className="card p-5 hover:border-white/15 transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-bold px-2 py-1 rounded border ${agencyColors[license.agency] || 'bg-white/[0.08] text-slate-300'}`}>{license.agency}</span>
        <span className="text-xs text-slate-400">{license.processingTimeMin}-{license.processingTimeMax} days</span>
      </div>
      <h4 className="font-semibold text-white mb-2">{license.licenseType}</h4>
      <p className="text-slate-400 text-sm mb-3">{license.description}</p>
      <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
        {license.applicationFee && (<span>Application: ${license.applicationFee.toLocaleString()}</span>)}
        {license.annualFee && (<span>Annual: ${license.annualFee.toLocaleString()}</span>)}
        {license.validityYears && (<span>Valid: {license.validityYears} years</span>)}
      </div>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-white/90 hover:text-white mb-3">{expanded ? 'Hide Requirements \u25B2' : 'Show Requirements \u25BC'}</button>
      {expanded && (
        <div className="bg-white/[0.04] rounded-lg p-3 mt-2">
          <h5 className="text-xs font-semibold text-slate-300 mb-2">Requirements Checklist</h5>
          <ul className="space-y-1">
            {(JSON.parse(JSON.stringify(license.requirements)) as string[]).map((req, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-400"><span className="text-white/90 mt-0.5">{'\u2610'}</span>{req}</li>))}
          </ul>
          <div className="mt-3 pt-3 border-t border-white/[0.06]"><h5 className="text-xs font-semibold text-slate-300 mb-1">Regulatory Basis</h5><p className="text-xs text-slate-400">{license.regulatoryBasis}</p></div>
          {license.applicationUrl && (<a href={license.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-white/90 hover:text-white">Apply Now &rarr;</a>)}
        </div>
      )}
    </div>
  );
}

export function ComplianceWizardTab() {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const filteredLicenses = LICENSE_REQUIREMENTS.filter(l => { if (categoryFilter && l.category !== categoryFilter) return false; if (agencyFilter && l.agency !== agencyFilter) return false; return true; });
  return (
    <div>
      <div className="bg-white/10 border border-white/10 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-white/90 mb-2">License Requirements Guide</h4>
        <p className="text-sm text-slate-400">Select your mission type below to see required licenses. Each license includes a checklist of requirements, processing times, fees, and links to application forms.</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none">
          <option value="">All License Types</option><option value="launch">Launch Licenses (FAA)</option><option value="satellite">Satellite Licenses (FCC)</option><option value="remote_sensing">Remote Sensing (NOAA)</option><option value="spectrum">Spectrum (ITU/FCC)</option><option value="export">Export Licenses</option>
        </select>
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none">
          <option value="">All Agencies</option><option value="FAA">FAA</option><option value="FCC">FCC</option><option value="NOAA">NOAA</option>
        </select>
      </div>
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filteredLicenses.map((license) => (<StaggerItem key={license.id}><LicenseCard license={license} /></StaggerItem>))}</StaggerContainer>
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-white mb-4">International Treaty Obligations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TREATY_OBLIGATIONS.map((treaty) => (
            <div key={treaty.id} className="card p-4">
              <div className="flex items-start justify-between mb-2"><h4 className="font-semibold text-white">{treaty.name}</h4>{treaty.usRatified && (<span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">US Ratified</span>)}</div>
              <p className="text-xs text-slate-400 mb-2">{treaty.fullName}</p>
              <div className="text-xs text-slate-400"><p><strong>Parties:</strong> {treaty.parties} nations</p><p className="mt-1"><strong>US Implementation:</strong> {treaty.usImplementation}</p></div>
              <a href={treaty.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-white/90 hover:text-white">View Treaty Text &rarr;</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ############################################################################
// CASE LAW ARCHIVE
// ############################################################################

function CaseCard({ lawCase }: { lawCase: SpaceLawCase }) {
  const [expanded, setExpanded] = useState(false);
  const outcomeColors = { plaintiff_victory: 'bg-green-500/20 text-green-400', defendant_victory: 'bg-red-500/20 text-red-400', settlement: 'bg-yellow-500/20 text-yellow-400', dismissed: 'bg-white/[0.04] text-slate-400', pending: 'bg-blue-500/20 text-blue-400', vacated: 'bg-purple-500/20 text-purple-400' };
  const jurisdictionIcons = { federal: '\uD83C\uDFDB\uFE0F', international: '\uD83C\uDF0D', arbitration: '\u2696\uFE0F', state: '\uD83C\uDFE2', gao: '\uD83D\uDCCA' };
  return (
    <div className="card p-5 hover:border-white/15 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2"><span className="text-xl">{jurisdictionIcons[lawCase.jurisdiction]}</span><span className="text-xs text-slate-400">{lawCase.year}</span></div>
        <span className={`text-xs px-2 py-1 rounded ${outcomeColors[lawCase.outcome]}`}>{lawCase.outcome.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
      </div>
      <h4 className="font-semibold text-white mb-1">{lawCase.caseName}</h4>
      {lawCase.citation && (<p className="text-xs text-slate-400 mb-2 font-mono">{lawCase.citation}</p>)}
      <p className="text-slate-400 text-sm mb-3 line-clamp-3">{lawCase.summary}</p>
      <div className="flex flex-wrap gap-1 mb-3">{lawCase.subjectMatter.map((subject, i) => (<span key={i} className="text-xs bg-white/10 text-white/90 px-2 py-0.5 rounded">{subject.replace(/_/g, ' ')}</span>))}</div>
      {lawCase.damages && (<div className="text-sm font-semibold text-green-400 mb-3">Damages: ${lawCase.damages.toLocaleString()}</div>)}
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-white/90 hover:text-white">{expanded ? 'Show Less \u25B2' : 'Read More \u25BC'}</button>
      {expanded && (
        <div className="mt-4 space-y-4">
          <div><h5 className="text-xs font-semibold text-slate-300 mb-1">Parties</h5><p className="text-xs text-slate-400"><strong>Plaintiff:</strong> {lawCase.parties.plaintiff}<br /><strong>Defendant:</strong> {lawCase.parties.defendant}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-300 mb-1">Facts</h5><p className="text-xs text-slate-400">{lawCase.facts}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-300 mb-1">Holdings</h5><ul className="text-xs text-slate-400 list-disc list-inside space-y-1">{lawCase.holdings.map((holding, i) => (<li key={i}>{holding}</li>))}</ul></div>
          <div><h5 className="text-xs font-semibold text-slate-300 mb-1">Significance</h5><p className="text-xs text-slate-400">{lawCase.significance}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-300 mb-1">Precedent Value</h5><p className="text-xs text-slate-400">{lawCase.precedentValue}</p></div>
          {lawCase.keyQuotes && lawCase.keyQuotes.length > 0 && (<div><h5 className="text-xs font-semibold text-slate-300 mb-1">Key Quotes</h5>{lawCase.keyQuotes.map((quote, i) => (<blockquote key={i} className="text-xs text-slate-400 italic border-l-2 border-white/15 pl-2 mb-1">&ldquo;{quote}&rdquo;</blockquote>))}</div>)}
          {lawCase.sourceUrl && (<a href={lawCase.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-white/90 hover:text-white">View Source &rarr;</a>)}
        </div>
      )}
    </div>
  );
}

export function CaseLawArchiveTab() {
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const allSubjects = Array.from(new Set(SPACE_LAW_CASES.flatMap(c => c.subjectMatter)));
  const filteredCases = SPACE_LAW_CASES.filter(c => { if (jurisdictionFilter && c.jurisdiction !== jurisdictionFilter) return false; if (subjectFilter && !c.subjectMatter.includes(subjectFilter)) return false; return true; });
  const totalDamages = filteredCases.filter(c => c.damages).reduce((sum, c) => sum + (c.damages || 0), 0);
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-white">{filteredCases.length}</div><div className="text-xs text-slate-400">Cases</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-green-400">${(totalDamages / 1e9).toFixed(2)}B</div><div className="text-xs text-slate-400">Total Damages</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-white/90">{filteredCases.filter(c => c.outcome === 'plaintiff_victory').length}</div><div className="text-xs text-slate-400">Plaintiff Wins</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-yellow-400">{filteredCases.filter(c => c.outcome === 'settlement').length}</div><div className="text-xs text-slate-400">Settlements</div></div>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={jurisdictionFilter} onChange={(e) => setJurisdictionFilter(e.target.value)} className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none">
          <option value="">All Jurisdictions</option><option value="federal">Federal Courts</option><option value="international">International</option><option value="arbitration">Arbitration</option>
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none">
          <option value="">All Subject Matter</option>{allSubjects.map(s => (<option key={s} value={s}>{s.replace(/_/g, ' ')}</option>))}
        </select>
        <div className="ml-auto"><ExportButton data={filteredCases} filename="space-law-cases" columns={[{ key: 'caseName', label: 'Case Name' },{ key: 'year', label: 'Year' },{ key: 'jurisdiction', label: 'Jurisdiction' },{ key: 'outcome', label: 'Outcome' },{ key: 'damages', label: 'Damages' },{ key: 'summary', label: 'Summary' }]} /></div>
      </div>
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filteredCases.map((lawCase) => (<StaggerItem key={lawCase.id}><CaseCard lawCase={lawCase} /></StaggerItem>))}</StaggerContainer>
    </div>
  );
}

// ############################################################################
// EXPORT CONTROL MONITOR
// ############################################################################

export function ExportControlMonitorTab() {
  const [activeSubTab, setActiveSubTab] = useState<'eccn' | 'usml'>('eccn');
  const [searchTerm, setSearchTerm] = useState('');
  const filteredECCNs = ECCN_CLASSIFICATIONS.filter(e => { if (!searchTerm) return true; const search = searchTerm.toLowerCase(); return e.eccn.toLowerCase().includes(search) || e.description.toLowerCase().includes(search) || e.spaceRelevance.toLowerCase().includes(search); });
  const filteredUSML = USML_CATEGORIES.filter(u => { if (!searchTerm) return true; const search = searchTerm.toLowerCase(); return u.category.toLowerCase().includes(search) || u.title.toLowerCase().includes(search) || u.description.toLowerCase().includes(search); });
  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveSubTab('eccn')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === 'eccn' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'}`}>ECCN Tracker (EAR)</button>
        <button onClick={() => setActiveSubTab('usml')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === 'usml' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'}`}>USML Tracker (ITAR)</button>
      </div>
      <div className="mb-6"><input type="search" placeholder="Search classifications..." aria-label="Search classifications" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-96 bg-white/[0.06] border border-white/[0.1] text-white/90 rounded-lg px-4 py-2 text-sm placeholder:text-slate-400" /></div>
      {activeSubTab === 'eccn' && (
        <div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-blue-400 mb-2">Export Administration Regulations (EAR)</h4><p className="text-sm text-slate-400">The Commerce Control List (CCL) classifies dual-use items by Export Control Classification Number (ECCN). Commercial satellites were transferred from ITAR to EAR via the 9x515 series in 2014.</p></div>
          <div className="space-y-4">{filteredECCNs.map((eccn) => (
            <div key={eccn.id} className="card p-5">
              <div className="flex items-start justify-between mb-3"><span className="font-mono text-lg font-bold text-blue-400">{eccn.eccn}</span><span className="text-xs bg-white/[0.08] text-slate-300 px-2 py-1 rounded">{eccn.category}</span></div>
              <h4 className="font-semibold text-white mb-2">{eccn.description}</h4><p className="text-sm text-slate-400 mb-3">{eccn.spaceRelevance}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div><h5 className="font-semibold text-slate-300 mb-1">Reason for Control</h5><div className="flex flex-wrap gap-1">{eccn.reasonForControl.map((r, i) => (<span key={i} className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">{r}</span>))}</div></div>
                <div><h5 className="font-semibold text-slate-300 mb-1">License Exceptions</h5><div className="flex flex-wrap gap-1">{eccn.licenseExceptions.map((e, i) => (<span key={i} className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded">{e}</span>))}</div></div>
              </div>
              <div className="mt-3"><h5 className="text-xs font-semibold text-slate-300 mb-1">Examples</h5><ul className="text-xs text-slate-400 list-disc list-inside">{eccn.examples.slice(0, 3).map((ex, i) => (<li key={i}>{ex}</li>))}</ul></div>
            </div>
          ))}</div>
        </div>
      )}
      {activeSubTab === 'usml' && (
        <div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-red-400 mb-2">International Traffic in Arms Regulations (ITAR)</h4><p className="text-sm text-slate-400">The United States Munitions List (USML) controls defense articles. Launch vehicles and defense spacecraft remain on USML. All exports require DDTC authorization with no license exceptions.</p></div>
          <div className="space-y-4">{filteredUSML.map((usml) => (
            <div key={usml.id} className="card p-5">
              <div className="flex items-start justify-between mb-3"><span className="font-mono text-lg font-bold text-red-400">Category {usml.category}</span><span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">ITAR</span></div>
              <h4 className="font-semibold text-white mb-2">{usml.title}</h4><p className="text-sm text-slate-400 mb-3">{usml.description}</p>
              <div className="mb-3"><h5 className="text-xs font-semibold text-slate-300 mb-1">Controlled Items</h5><ul className="text-xs text-slate-400 list-disc list-inside">{usml.items.map((item, i) => (<li key={i}>{item}</li>))}</ul></div>
              <div className="bg-white/[0.04] rounded p-3"><h5 className="text-xs font-semibold text-slate-300 mb-1">Space Relevance</h5><p className="text-xs text-slate-400">{usml.spaceRelevance}</p></div>
              {usml.exemptions && usml.exemptions.length > 0 && (<div className="mt-3"><h5 className="text-xs font-semibold text-slate-300 mb-1">Exemptions / Notes</h5><ul className="text-xs text-slate-400 list-disc list-inside">{usml.exemptions.map((ex, i) => (<li key={i}>{ex}</li>))}</ul></div>)}
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}

// ############################################################################
// EXPERT COMMENTARY
// ############################################################################

export function ExpertCommentaryTab() {
  const [typeFilter, setTypeFilter] = useState('');
  const filteredSources = EXPERT_SOURCES.filter(s => { if (typeFilter && s.type !== typeFilter) return false; return s.isActive; });
  const typeLabels: Record<string, { label: string; icon: string; color: string }> = { law_firm: { label: 'Law Firms', icon: '\u2696\uFE0F', color: 'bg-purple-500/20 text-purple-400' }, think_tank: { label: 'Think Tanks', icon: '\uD83D\uDCA1', color: 'bg-yellow-500/20 text-yellow-400' }, government: { label: 'Government', icon: '\uD83C\uDFDB\uFE0F', color: 'bg-blue-500/20 text-blue-400' }, academic: { label: 'Academic', icon: '\uD83C\uDF93', color: 'bg-green-500/20 text-green-400' }, industry_association: { label: 'Industry', icon: '\uD83C\uDFE2', color: 'bg-orange-500/20 text-orange-400' } };
  return (
    <div>
      <div className="bg-white/10 border border-white/10 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-white/90 mb-2">Expert Sources & Commentary</h4>
        <p className="text-sm text-slate-400">Curated collection of authoritative sources for space law, policy analysis, and industry commentary. Follow these sources for the latest expert insights on regulatory developments.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setTypeFilter('')} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${!typeFilter ? 'bg-black text-white' : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'}`}>All Sources</button>
        {Object.entries(typeLabels).map(([type, info]) => (<button key={type} onClick={() => setTypeFilter(type)} className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1 ${typeFilter === type ? 'bg-black text-white' : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'}`}><span>{info.icon}</span>{info.label}</button>))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSources.map((source) => { const typeInfo = typeLabels[source.type]; return (
          <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="card p-5 hover:border-white/15 transition-all group">
            <div className="flex items-start justify-between mb-3"><span className="text-3xl">{typeInfo?.icon || '\uD83D\uDCCB'}</span><span className={`text-xs px-2 py-1 rounded ${typeInfo?.color || 'bg-white/[0.08]'}`}>{typeInfo?.label || source.type}</span></div>
            <h4 className="font-semibold text-white mb-1 group-hover:text-white/90 transition-colors">{source.name}</h4>
            {source.organization && (<p className="text-sm text-slate-400 mb-2">{source.organization}</p>)}
            <p className="text-xs text-slate-400 mb-3 line-clamp-2">{source.description}</p>
            <div className="flex flex-wrap gap-1">{source.topics.slice(0, 3).map((topic, i) => (<span key={i} className="text-xs bg-white/[0.08] text-slate-300 px-2 py-0.5 rounded">{topic.replace(/_/g, ' ')}</span>))}</div>
            {source.keyContributors && source.keyContributors.length > 0 && (<div className="mt-3 pt-3 border-t border-white/[0.06]"><p className="text-xs text-slate-400"><strong>Contributors:</strong> {source.keyContributors.join(', ')}</p></div>)}
          </a>
        ); })}
      </div>
    </div>
  );
}
