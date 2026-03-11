'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { clientLogger } from '@/lib/client-logger';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import InlineDisclaimer from '@/components/InlineDisclaimer';
import DataFreshness from '@/components/ui/DataFreshness';
import PremiumGate from '@/components/PremiumGate';
import ExportButton from '@/components/ui/ExportButton';
import RelatedModules from '@/components/ui/RelatedModules';

// Lazy-load non-default tab sections (only visible when their section tab is clicked)
const SpaceLawSection = dynamic(() => import('./SpaceLawSection'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="h-20 bg-slate-800 rounded-lg"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}</div>
    </div>
  ),
});
const FilingsSection = dynamic(() => import('./FilingsSection'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>)}</div>
      <div className="h-16 bg-slate-800 rounded-lg"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}</div>
    </div>
  ),
});
const ProtestsSection = dynamic(() => import('./ProtestsSection'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="h-20 bg-slate-800 rounded-lg"></div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>)}</div>
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-slate-800 rounded-lg"></div>)}</div>
    </div>
  ),
});
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
import FAQSchema from '@/components/seo/FAQSchema';
import {
  type SpaceLawTabId,
  type TreatyStatus,
  type NationalLawStatus,
  type ArtemisStatus,
  type ProceedingStatus,
  type BodyType,
  type Treaty,
  type NationalLaw,
  type ArtemisSignatory,
  type LegalProceeding,
  type RegulatoryBody,
  TREATY_STATUS_CONFIG,
  DEFAULT_TREATY_STATUS,
  NATIONAL_STATUS_CONFIG,
  DEFAULT_NATIONAL_STATUS,
  ARTEMIS_STATUS_CONFIG,
  DEFAULT_ARTEMIS_STATUS,
  PROCEEDING_STATUS_CONFIG,
  DEFAULT_PROCEEDING_STATUS,
  BODY_TYPE_CONFIG,
  DEFAULT_BODY_TYPE,
  type FilingsTabId,
  type FilingStatus,
  type FCCFiling,
  type FAALicense,
  type ITUFiling,
  type SECFiling,
  type FederalRegisterEntry,
  FILING_STATUS_STYLES,
  DEFAULT_FILING_STATUS_STYLE,
  FILING_IMPACT_STYLES,
  DEFAULT_FILING_IMPACT_STYLE,
  FILING_ORBIT_STYLES,
  DEFAULT_FILING_ORBIT_STYLE,
} from './data';

// Runtime-populated data (populated from DynamicContent API)
let TREATIES: Treaty[] = [];
let NATIONAL_LAWS: NationalLaw[] = [];
let ARTEMIS_PRINCIPLES: { title: string; description: string }[] = [];
let ARTEMIS_SIGNATORIES: ArtemisSignatory[] = [];
let LEGAL_PROCEEDINGS: LegalProceeding[] = [];
let REGULATORY_BODIES: RegulatoryBody[] = [];

let FCC_FILINGS: FCCFiling[] = [];
let FAA_LICENSES: FAALicense[] = [];
let ITU_FILINGS: ITUFiling[] = [];
let SEC_FILINGS: SECFiling[] = [];
let FEDERAL_REGISTER_ENTRIES: FederalRegisterEntry[] = [];

// ############################################################################


function getFilingsTabs(): { id: FilingsTabId; label: string; count: number }[] {
  return [
    { id: 'fcc', label: 'FCC Filings', count: FCC_FILINGS.length },
    { id: 'faa', label: 'FAA Licenses', count: FAA_LICENSES.length },
    { id: 'itu', label: 'ITU Filings', count: ITU_FILINGS.length },
    { id: 'sec', label: 'SEC & Financial', count: SEC_FILINGS.length },
    { id: 'federal-register', label: 'Federal Register', count: FEDERAL_REGISTER_ENTRIES.length },
  ];
}

// ############################################################################
// COMPLIANCE SECTION COMPONENTS (existing)
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
    withdrawn: 'bg-slate-800/500/20 text-slate-400',
    superseded: 'bg-slate-800/500/20 text-slate-400',
  };
  const agencyIcons: Record<string, string> = {
    FAA: '\u2708\uFE0F', FCC: '\uD83D\uDCE1', NOAA: '\uD83C\uDF0A', BIS: '\uD83D\uDCE6', DDTC: '\uD83D\uDD12', NASA: '\uD83D\uDE80', DOD: '\uD83C\uDF96\uFE0F', DOS: '\uD83C\uDFDB\uFE0F',
  };
  const deadline = policy.commentDeadline ? new Date(policy.commentDeadline) : null;
  const isUrgent = deadline && deadline > new Date() && deadline < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{agencyIcons[policy.agency] || '\uD83D\uDCCB'}</span>
          <span className="text-xs font-bold text-nebula-300 bg-slate-700/60 px-2 py-1 rounded">{policy.agency}</span>
          <span className={`text-xs px-2 py-1 rounded ${statusColors[policy.status]}`}>{policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded border ${severityColors[policy.impactSeverity]}`}>{policy.impactSeverity.toUpperCase()} Impact</span>
      </div>
      <h4 className="font-semibold text-white mb-2">{policy.title}</h4>
      <p className="text-slate-400 text-sm mb-3 line-clamp-3">{policy.summary}</p>
      <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
        <h5 className="text-xs font-semibold text-slate-300 mb-1">Impact Analysis</h5>
        <p className="text-xs text-slate-400 line-clamp-2">{policy.impactAnalysis}</p>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {policy.affectedParties.slice(0, 3).map((party, i) => (
          <span key={i} className="text-xs bg-nebula-500/10 text-nebula-300 px-2 py-0.5 rounded">{party.replace(/_/g, ' ')}</span>
        ))}
        {policy.affectedParties.length > 3 && (<span className="text-xs text-slate-400">+{policy.affectedParties.length - 3} more</span>)}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{policy.federalRegisterCitation || `Published: ${new Date(policy.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}`}</span>
        {deadline && (<span className={`${isUrgent ? 'text-yellow-500 font-semibold' : 'text-slate-400'}`}>{isUrgent && '\u26A0\uFE0F '}Comments due: {deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>)}
      </div>
      <a href={policy.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-nebula-300 hover:text-nebula-200 mt-3">View Full Policy &rarr;</a>
    </div>
  );
}

function PolicyTrackerTab() {
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
              <div key={i} className="bg-slate-800/60 rounded p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-400">{d.policy.agency}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${d.deadlineType === 'comment' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>{d.deadlineType === 'comment' ? 'Comment Deadline' : 'Effective Date'}</span>
                </div>
                <p className="text-sm text-slate-200 line-clamp-1">{d.policy.title}</p>
                <p className="text-xs text-slate-400 mt-1">{d.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none">
          <option value="">All Agencies</option><option value="FAA">FAA (Launches)</option><option value="FCC">FCC (Spectrum)</option><option value="NOAA">NOAA (Remote Sensing)</option><option value="BIS">BIS (Export Controls)</option><option value="DDTC">DDTC (ITAR)</option><option value="NASA">NASA</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none">
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

function LicenseCard({ license }: { license: LicenseRequirement }) {
  const [expanded, setExpanded] = useState(false);
  const agencyColors: Record<string, string> = { FAA: 'bg-orange-500/20 text-orange-400 border-orange-500/30', FCC: 'bg-blue-500/20 text-blue-400 border-blue-500/30', NOAA: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-bold px-2 py-1 rounded border ${agencyColors[license.agency] || 'bg-slate-700/60 text-slate-300'}`}>{license.agency}</span>
        <span className="text-xs text-slate-400">{license.processingTimeMin}-{license.processingTimeMax} days</span>
      </div>
      <h4 className="font-semibold text-white mb-2">{license.licenseType}</h4>
      <p className="text-slate-400 text-sm mb-3">{license.description}</p>
      <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
        {license.applicationFee && (<span>Application: ${license.applicationFee.toLocaleString()}</span>)}
        {license.annualFee && (<span>Annual: ${license.annualFee.toLocaleString()}</span>)}
        {license.validityYears && (<span>Valid: {license.validityYears} years</span>)}
      </div>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 mb-3">{expanded ? 'Hide Requirements \u25B2' : 'Show Requirements \u25BC'}</button>
      {expanded && (
        <div className="bg-slate-800/50 rounded-lg p-3 mt-2">
          <h5 className="text-xs font-semibold text-slate-300 mb-2">Requirements Checklist</h5>
          <ul className="space-y-1">
            {(JSON.parse(JSON.stringify(license.requirements)) as string[]).map((req, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-400"><span className="text-nebula-300 mt-0.5">{'\u2610'}</span>{req}</li>))}
          </ul>
          <div className="mt-3 pt-3 border-t border-slate-700"><h5 className="text-xs font-semibold text-slate-300 mb-1">Regulatory Basis</h5><p className="text-xs text-slate-400">{license.regulatoryBasis}</p></div>
          {license.applicationUrl && (<a href={license.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-nebula-300 hover:text-nebula-200">Apply Now &rarr;</a>)}
        </div>
      )}
    </div>
  );
}

function ComplianceWizardTab() {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const filteredLicenses = LICENSE_REQUIREMENTS.filter(l => { if (categoryFilter && l.category !== categoryFilter) return false; if (agencyFilter && l.agency !== agencyFilter) return false; return true; });
  return (
    <div>
      <div className="bg-nebula-500/10 border border-nebula-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-nebula-300 mb-2">License Requirements Guide</h4>
        <p className="text-sm text-slate-400">Select your mission type below to see required licenses. Each license includes a checklist of requirements, processing times, fees, and links to application forms.</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none">
          <option value="">All License Types</option><option value="launch">Launch Licenses (FAA)</option><option value="satellite">Satellite Licenses (FCC)</option><option value="remote_sensing">Remote Sensing (NOAA)</option><option value="spectrum">Spectrum (ITU/FCC)</option><option value="export">Export Licenses</option>
        </select>
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none">
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
              <a href={treaty.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-nebula-300 hover:text-nebula-200">View Treaty Text &rarr;</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CaseCard({ lawCase }: { lawCase: SpaceLawCase }) {
  const [expanded, setExpanded] = useState(false);
  const outcomeColors = { plaintiff_victory: 'bg-green-500/20 text-green-400', defendant_victory: 'bg-red-500/20 text-red-400', settlement: 'bg-yellow-500/20 text-yellow-400', dismissed: 'bg-slate-800/500/20 text-slate-400', pending: 'bg-blue-500/20 text-blue-400', vacated: 'bg-purple-500/20 text-purple-400' };
  const jurisdictionIcons = { federal: '\uD83C\uDFDB\uFE0F', international: '\uD83C\uDF0D', arbitration: '\u2696\uFE0F', state: '\uD83C\uDFE2', gao: '\uD83D\uDCCA' };
  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2"><span className="text-xl">{jurisdictionIcons[lawCase.jurisdiction]}</span><span className="text-xs text-slate-400">{lawCase.year}</span></div>
        <span className={`text-xs px-2 py-1 rounded ${outcomeColors[lawCase.outcome]}`}>{lawCase.outcome.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
      </div>
      <h4 className="font-semibold text-white mb-1">{lawCase.caseName}</h4>
      {lawCase.citation && (<p className="text-xs text-slate-400 mb-2 font-mono">{lawCase.citation}</p>)}
      <p className="text-slate-400 text-sm mb-3 line-clamp-3">{lawCase.summary}</p>
      <div className="flex flex-wrap gap-1 mb-3">{lawCase.subjectMatter.map((subject, i) => (<span key={i} className="text-xs bg-nebula-500/10 text-nebula-300 px-2 py-0.5 rounded">{subject.replace(/_/g, ' ')}</span>))}</div>
      {lawCase.damages && (<div className="text-sm font-semibold text-green-400 mb-3">Damages: ${lawCase.damages.toLocaleString()}</div>)}
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200">{expanded ? 'Show Less \u25B2' : 'Read More \u25BC'}</button>
      {expanded && (
        <div className="mt-4 space-y-4">
          <div><h5 className="text-xs font-semibold text-slate-300 mb-1">Parties</h5><p className="text-xs text-slate-400"><strong>Plaintiff:</strong> {lawCase.parties.plaintiff}<br /><strong>Defendant:</strong> {lawCase.parties.defendant}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-300 mb-1">Facts</h5><p className="text-xs text-slate-400">{lawCase.facts}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-300 mb-1">Holdings</h5><ul className="text-xs text-slate-400 list-disc list-inside space-y-1">{lawCase.holdings.map((holding, i) => (<li key={i}>{holding}</li>))}</ul></div>
          <div><h5 className="text-xs font-semibold text-slate-300 mb-1">Significance</h5><p className="text-xs text-slate-400">{lawCase.significance}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-300 mb-1">Precedent Value</h5><p className="text-xs text-slate-400">{lawCase.precedentValue}</p></div>
          {lawCase.keyQuotes && lawCase.keyQuotes.length > 0 && (<div><h5 className="text-xs font-semibold text-slate-300 mb-1">Key Quotes</h5>{lawCase.keyQuotes.map((quote, i) => (<blockquote key={i} className="text-xs text-slate-400 italic border-l-2 border-nebula-500 pl-2 mb-1">&ldquo;{quote}&rdquo;</blockquote>))}</div>)}
          {lawCase.sourceUrl && (<a href={lawCase.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-nebula-300 hover:text-nebula-200">View Source &rarr;</a>)}
        </div>
      )}
    </div>
  );
}

function CaseLawArchiveTab() {
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
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-nebula-300">{filteredCases.filter(c => c.outcome === 'plaintiff_victory').length}</div><div className="text-xs text-slate-400">Plaintiff Wins</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-yellow-400">{filteredCases.filter(c => c.outcome === 'settlement').length}</div><div className="text-xs text-slate-400">Settlements</div></div>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={jurisdictionFilter} onChange={(e) => setJurisdictionFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none">
          <option value="">All Jurisdictions</option><option value="federal">Federal Courts</option><option value="international">International</option><option value="arbitration">Arbitration</option>
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none">
          <option value="">All Subject Matter</option>{allSubjects.map(s => (<option key={s} value={s}>{s.replace(/_/g, ' ')}</option>))}
        </select>
        <div className="ml-auto"><ExportButton data={filteredCases} filename="space-law-cases" columns={[{ key: 'caseName', label: 'Case Name' },{ key: 'year', label: 'Year' },{ key: 'jurisdiction', label: 'Jurisdiction' },{ key: 'outcome', label: 'Outcome' },{ key: 'damages', label: 'Damages' },{ key: 'summary', label: 'Summary' }]} /></div>
      </div>
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filteredCases.map((lawCase) => (<StaggerItem key={lawCase.id}><CaseCard lawCase={lawCase} /></StaggerItem>))}</StaggerContainer>
    </div>
  );
}

function ExportControlMonitorTab() {
  const [activeSubTab, setActiveSubTab] = useState<'eccn' | 'usml'>('eccn');
  const [searchTerm, setSearchTerm] = useState('');
  const filteredECCNs = ECCN_CLASSIFICATIONS.filter(e => { if (!searchTerm) return true; const search = searchTerm.toLowerCase(); return e.eccn.toLowerCase().includes(search) || e.description.toLowerCase().includes(search) || e.spaceRelevance.toLowerCase().includes(search); });
  const filteredUSML = USML_CATEGORIES.filter(u => { if (!searchTerm) return true; const search = searchTerm.toLowerCase(); return u.category.toLowerCase().includes(search) || u.title.toLowerCase().includes(search) || u.description.toLowerCase().includes(search); });
  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveSubTab('eccn')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === 'eccn' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'}`}>ECCN Tracker (EAR)</button>
        <button onClick={() => setActiveSubTab('usml')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === 'usml' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'}`}>USML Tracker (ITAR)</button>
      </div>
      <div className="mb-6"><input type="search" placeholder="Search classifications..." aria-label="Search classifications" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-96 bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-4 py-2 text-sm placeholder:text-slate-400" /></div>
      {activeSubTab === 'eccn' && (
        <div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-blue-400 mb-2">Export Administration Regulations (EAR)</h4><p className="text-sm text-slate-400">The Commerce Control List (CCL) classifies dual-use items by Export Control Classification Number (ECCN). Commercial satellites were transferred from ITAR to EAR via the 9x515 series in 2014.</p></div>
          <div className="space-y-4">{filteredECCNs.map((eccn) => (
            <div key={eccn.id} className="card p-5">
              <div className="flex items-start justify-between mb-3"><span className="font-mono text-lg font-bold text-blue-400">{eccn.eccn}</span><span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-1 rounded">{eccn.category}</span></div>
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
              <div className="bg-slate-800/50 rounded p-3"><h5 className="text-xs font-semibold text-slate-300 mb-1">Space Relevance</h5><p className="text-xs text-slate-400">{usml.spaceRelevance}</p></div>
              {usml.exemptions && usml.exemptions.length > 0 && (<div className="mt-3"><h5 className="text-xs font-semibold text-slate-300 mb-1">Exemptions / Notes</h5><ul className="text-xs text-slate-400 list-disc list-inside">{usml.exemptions.map((ex, i) => (<li key={i}>{ex}</li>))}</ul></div>)}
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}

function ExpertCommentaryTab() {
  const [typeFilter, setTypeFilter] = useState('');
  const filteredSources = EXPERT_SOURCES.filter(s => { if (typeFilter && s.type !== typeFilter) return false; return s.isActive; });
  const typeLabels: Record<string, { label: string; icon: string; color: string }> = { law_firm: { label: 'Law Firms', icon: '\u2696\uFE0F', color: 'bg-purple-500/20 text-purple-400' }, think_tank: { label: 'Think Tanks', icon: '\uD83D\uDCA1', color: 'bg-yellow-500/20 text-yellow-400' }, government: { label: 'Government', icon: '\uD83C\uDFDB\uFE0F', color: 'bg-blue-500/20 text-blue-400' }, academic: { label: 'Academic', icon: '\uD83C\uDF93', color: 'bg-green-500/20 text-green-400' }, industry_association: { label: 'Industry', icon: '\uD83C\uDFE2', color: 'bg-orange-500/20 text-orange-400' } };
  return (
    <div>
      <div className="bg-nebula-500/10 border border-nebula-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-nebula-300 mb-2">Expert Sources & Commentary</h4>
        <p className="text-sm text-slate-400">Curated collection of authoritative sources for space law, policy analysis, and industry commentary. Follow these sources for the latest expert insights on regulatory developments.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setTypeFilter('')} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${!typeFilter ? 'bg-slate-900 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'}`}>All Sources</button>
        {Object.entries(typeLabels).map(([type, info]) => (<button key={type} onClick={() => setTypeFilter(type)} className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1 ${typeFilter === type ? 'bg-slate-900 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'}`}><span>{info.icon}</span>{info.label}</button>))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSources.map((source) => { const typeInfo = typeLabels[source.type]; return (
          <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="card p-5 hover:border-nebula-500/50 transition-all group">
            <div className="flex items-start justify-between mb-3"><span className="text-3xl">{typeInfo?.icon || '\uD83D\uDCCB'}</span><span className={`text-xs px-2 py-1 rounded ${typeInfo?.color || 'bg-slate-700'}`}>{typeInfo?.label || source.type}</span></div>
            <h4 className="font-semibold text-white mb-1 group-hover:text-nebula-300 transition-colors">{source.name}</h4>
            {source.organization && (<p className="text-sm text-slate-400 mb-2">{source.organization}</p>)}
            <p className="text-xs text-slate-400 mb-3 line-clamp-2">{source.description}</p>
            <div className="flex flex-wrap gap-1">{source.topics.slice(0, 3).map((topic, i) => (<span key={i} className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">{topic.replace(/_/g, ' ')}</span>))}</div>
            {source.keyContributors && source.keyContributors.length > 0 && (<div className="mt-3 pt-3 border-t border-slate-700/50"><p className="text-xs text-slate-400"><strong>Contributors:</strong> {source.keyContributors.join(', ')}</p></div>)}
          </a>
        ); })}
      </div>
    </div>
  );
}

// ############################################################################
// SPACE LAW SECTION COMPONENTS
// ############################################################################

function TreatyCard({ treaty }: { treaty: Treaty }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = TREATY_STATUS_CONFIG[treaty.status] || DEFAULT_TREATY_STATUS;
  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-lg">{treaty.name}</h4><p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{treaty.fullName}</p></div>
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
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
          <div><h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Key Provisions</h5><ul className="space-y-1.5">{treaty.keyProvisions.map((provision, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-500"><span className="text-cyan-400 mt-0.5 flex-shrink-0">*</span>{provision}</li>))}</ul></div>
          <div><h5 className="text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Significance</h5><p className="text-xs text-slate-500">{treaty.significance}</p></div>
          <div className="text-xs text-slate-400">Adopted: {treaty.adoptedYear} | Depositary: {treaty.depositary}</div>
        </div>
      )}
    </div>
  );
}

function SpaceLawTreatiesTab() {
  return (
    <div>
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-blue-400 mb-2">United Nations Space Treaty Framework</h4><p className="text-sm text-slate-400">Five core UN treaties form the foundation of international space law. The Outer Space Treaty (1967) serves as the cornerstone, with four supplementary treaties addressing specific aspects of space activities.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{TREATIES.map((treaty) => (<TreatyCard key={treaty.id} treaty={treaty} />))}</div>
      <div className="card p-5 border-dashed mt-6">
        <h3 className="text-lg font-semibold text-white mb-3">Treaty Ratification Overview</h3>
        <div className="space-y-3">{TREATIES.map((treaty) => { const maxRatifications = 114; const pct = (treaty.ratifications / maxRatifications) * 100; return (<div key={treaty.id}><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-400 font-medium">{treaty.name}</span><span className="text-sm text-slate-400">{treaty.ratifications} ratifications</span></div><div className="h-3 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${treaty.status === 'not_in_force' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-gradient-to-r from-cyan-500 to-blue-400'}`} style={{ width: `${pct}%` }} /></div></div>); })}</div>
        <p className="text-xs text-slate-400 mt-4">Data based on UNOOSA treaty status reports. Signatories that have not ratified are counted separately.</p>
      </div>
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
          <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-600/40 flex items-center justify-center text-sm font-bold text-slate-400">{law.countryCode}</div>
          <div><h4 className="font-semibold text-white">{law.country}</h4><span className="text-slate-400 text-xs">{law.agency}</span></div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>{statusConfig.label}</span>
      </div>
      <h5 className="text-sm font-medium text-nebula-300 mb-1">{law.lawName}</h5>
      <div className="flex items-center gap-3 text-xs text-slate-400 mb-3"><span>Year: {law.year}</span><span>Scope: {law.scope}</span></div>
      <p className="text-slate-500 text-sm mb-3 line-clamp-2">{law.description}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors">{expanded ? 'Show Less' : 'View Key Features'}</button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700/50"><h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Key Features</h5><ul className="space-y-1.5">{law.keyFeatures.map((feature, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-500"><svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{feature}</li>))}</ul></div>
      )}
    </div>
  );
}

function SpaceLawNationalTab() {
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const countries = useMemo(() => Array.from(new Set(NATIONAL_LAWS.map(l => l.country))).sort(), []);
  const filteredLaws = useMemo(() => { let result = [...NATIONAL_LAWS]; if (countryFilter) result = result.filter(l => l.country === countryFilter); if (statusFilter) result = result.filter(l => l.status === statusFilter); return result; }, [countryFilter, statusFilter]);
  return (
    <div>
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-cyan-400 mb-2">National Space Legislation Tracker</h4><p className="text-sm text-slate-400">As commercial space activities expand, nations are rapidly developing domestic legislation to regulate launches, satellite operations, space resources, and liability. This tracker monitors major national frameworks.</p></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div><label className="block text-slate-400 text-sm mb-1">Country</label><select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Countries</option>{countries.map(c => (<option key={c} value={c}>{c}</option>))}</select></div>
        <div><label className="block text-slate-400 text-sm mb-1">Status</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Statuses</option><option value="enacted">Enacted</option><option value="amended">Amended</option><option value="proposed">Proposed</option><option value="under_review">Under Review</option></select></div>
        {(countryFilter || statusFilter) && (<button onClick={() => { setCountryFilter(''); setStatusFilter(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="flex items-center justify-between mb-4"><span className="text-sm text-slate-400">Showing {filteredLaws.length} of {NATIONAL_LAWS.length} laws</span></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{filteredLaws.map((law) => (<NationalLawCard key={law.id} law={law} />))}</div>
    </div>
  );
}

function SpaceLawArtemisTab() {
  const [regionFilter, setRegionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const regions = useMemo(() => Array.from(new Set(ARTEMIS_SIGNATORIES.map(s => s.region))).sort(), []);
  const filteredSignatories = useMemo(() => { let result = [...ARTEMIS_SIGNATORIES]; if (regionFilter) result = result.filter(s => s.region === regionFilter); if (searchQuery) { const query = searchQuery.toLowerCase(); result = result.filter(s => s.country.toLowerCase().includes(query) || s.spaceAgency.toLowerCase().includes(query) || s.notes.toLowerCase().includes(query)); } return result; }, [regionFilter, searchQuery]);
  const regionCounts = useMemo(() => { const counts: Record<string, number> = {}; ARTEMIS_SIGNATORIES.forEach(s => { counts[s.region] = (counts[s.region] || 0) + 1; }); return counts; }, []);
  return (
    <div>
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-white mb-2">About the Artemis Accords</h3><p className="text-slate-500 text-sm mb-4">The Artemis Accords are a set of bilateral agreements between the United States and partner nations, grounded in the Outer Space Treaty. Established in 2020 by NASA, they set principles for the responsible and peaceful exploration of the Moon, Mars, and other celestial bodies as part of the Artemis program.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-green-400">{ARTEMIS_SIGNATORIES.length}</div><div className="text-slate-400 text-xs">Total Signatories</div></div>
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-cyan-400">{Object.keys(regionCounts).length}</div><div className="text-slate-400 text-xs">Regions</div></div>
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-400">{ARTEMIS_SIGNATORIES.filter(s => s.implementationStatus === 'implementing').length}</div><div className="text-slate-400 text-xs">Implementing</div></div>
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-purple-400">{ARTEMIS_PRINCIPLES.length}</div><div className="text-slate-400 text-xs">Core Principles</div></div>
        </div>
      </div>
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-white mb-4">Core Principles</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{ARTEMIS_PRINCIPLES.map((principle, i) => (<div key={i} className="bg-slate-800/50/50 border border-slate-700/30 rounded-lg p-4"><div className="flex items-center gap-2 mb-1"><span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">{i + 1}</span><h5 className="font-medium text-white text-sm">{principle.title}</h5></div><p className="text-xs text-slate-500 ml-8">{principle.description}</p></div>))}</div></div>
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-white mb-3">Regional Distribution</h3><div className="space-y-3">{Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).map(([region, count]) => { const maxCount = Math.max(...Object.values(regionCounts)); const pct = (count / maxCount) * 100; return (<div key={region}><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-400 font-medium">{region}</span><span className="text-sm text-slate-400">{count} signatories</span></div><div className="h-3 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} /></div></div>); })}</div></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]"><label className="block text-slate-400 text-sm mb-1">Search</label><input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search countries, agencies..." className="w-full bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400" /></div>
        <div><label className="block text-slate-400 text-sm mb-1">Region</label><select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Regions</option>{regions.map(r => (<option key={r} value={r}>{r} ({regionCounts[r]})</option>))}</select></div>
        {(regionFilter || searchQuery) && (<button onClick={() => { setRegionFilter(''); setSearchQuery(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="flex items-center justify-between mb-4"><span className="text-sm text-slate-400">Showing {filteredSignatories.length} of {ARTEMIS_SIGNATORIES.length} signatories</span></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredSignatories.map((signatory) => { const status = ARTEMIS_STATUS_CONFIG[signatory.implementationStatus] || DEFAULT_ARTEMIS_STATUS; return (<div key={signatory.id} className="card p-4 hover:border-cyan-500/30 transition-all"><div className="flex items-start justify-between mb-2"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-600/40 flex items-center justify-center text-sm font-bold text-slate-400">{signatory.countryCode}</div><div><h4 className="font-semibold text-white text-sm">{signatory.country}</h4><span className="text-slate-400 text-xs">{signatory.spaceAgency}</span></div></div><span className={`text-xs px-2 py-0.5 rounded border ${status.bg} ${status.text} ${status.border}`}>{status.label}</span></div><div className="flex items-center gap-3 text-xs text-slate-400 mb-2"><span>Signed: {new Date(signatory.dateSigned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span><span>{signatory.region}</span></div><p className="text-xs text-slate-500 line-clamp-2">{signatory.notes}</p></div>); })}</div>
    </div>
  );
}

function ProceedingCard({ proceeding }: { proceeding: LegalProceeding }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = PROCEEDING_STATUS_CONFIG[proceeding.status] || DEFAULT_PROCEEDING_STATUS;
  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-2"><div className="flex items-center gap-2"><span className="text-xs text-slate-400 bg-slate-800/50 border border-slate-600/40 px-2 py-0.5 rounded font-medium">{proceeding.type}</span><span className="text-xs text-slate-400">{proceeding.year}</span></div><span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>{statusConfig.label}</span></div>
      <h4 className="font-semibold text-white mb-1">{proceeding.title}</h4><p className="text-xs text-slate-400 mb-3">{proceeding.parties}</p>
      <p className="text-slate-500 text-sm mb-3 line-clamp-3">{proceeding.description}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors">{expanded ? 'Show Less' : 'View Details'}</button>
      {expanded && (<div className="mt-3 pt-3 border-t border-slate-700/50 space-y-3"><div><h5 className="text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Jurisdiction</h5><p className="text-xs text-slate-500">{proceeding.jurisdiction}</p></div><div><h5 className="text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Significance</h5><p className="text-xs text-slate-500">{proceeding.significance}</p></div><div><h5 className="text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Outcome</h5><p className="text-xs text-slate-500">{proceeding.outcome}</p></div></div>)}
    </div>
  );
}

function SpaceLawProceedingsTab() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const types = useMemo(() => Array.from(new Set(LEGAL_PROCEEDINGS.map(p => p.type))).sort(), []);
  const filteredProceedings = useMemo(() => { let result = [...LEGAL_PROCEEDINGS]; if (typeFilter) result = result.filter(p => p.type === typeFilter); if (statusFilter) result = result.filter(p => p.status === statusFilter); return result.sort((a, b) => b.year - a.year); }, [typeFilter, statusFilter]);
  return (
    <div>
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-red-400 mb-2">Space Law Cases and Legal Proceedings</h4><p className="text-sm text-slate-400">Tracking notable legal disputes, regulatory enforcement actions, and advisory opinions that shape the evolving body of space law. Includes both international and domestic proceedings.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{LEGAL_PROCEEDINGS.length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Cases</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-red-400">{LEGAL_PROCEEDINGS.filter(p => p.status === 'active').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Active</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{LEGAL_PROCEEDINGS.filter(p => p.status === 'resolved').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Resolved</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{LEGAL_PROCEEDINGS.filter(p => p.status === 'pending').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Pending</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div><label className="block text-slate-400 text-sm mb-1">Case Type</label><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Types</option>{types.map(t => (<option key={t} value={t}>{t}</option>))}</select></div>
        <div><label className="block text-slate-400 text-sm mb-1">Status</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Statuses</option><option value="active">Active</option><option value="resolved">Resolved</option><option value="pending">Pending</option><option value="advisory">Advisory</option></select></div>
        {(typeFilter || statusFilter) && (<button onClick={() => { setTypeFilter(''); setStatusFilter(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filteredProceedings.map((p) => (<ProceedingCard key={p.id} proceeding={p} />))}</div>
    </div>
  );
}

function BodyCard({ body }: { body: RegulatoryBody }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = BODY_TYPE_CONFIG[body.type] || DEFAULT_BODY_TYPE;
  return (
    <div className="card p-5 hover:border-nebula-500/30 transition-all">
      <div className="flex items-start justify-between mb-3"><div><div className="flex items-center gap-2 mb-1"><h4 className="font-semibold text-white">{body.abbreviation}</h4><span className={`text-xs px-2 py-0.5 rounded border ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border}`}>{typeConfig.label}</span></div><p className="text-slate-400 text-sm">{body.name}</p></div></div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3"><span>Est. {body.established}</span><span>{body.headquarters}</span><span>{body.members}</span></div>
      <p className="text-slate-500 text-sm mb-3 line-clamp-2">{body.mandate}</p>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors">{expanded ? 'Show Less' : 'View Functions'}</button>
      {expanded && (<div className="mt-3 pt-3 border-t border-slate-700/50"><h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Key Functions</h5><ul className="space-y-1.5">{body.keyFunctions.map((func, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-500"><svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{func}</li>))}</ul><a href={body.website} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-nebula-300 hover:text-nebula-200">Visit Website</a></div>)}
    </div>
  );
}

function SpaceLawBodiesTab() {
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const filteredBodies = useMemo(() => { let result = [...REGULATORY_BODIES]; if (typeFilter) result = result.filter(b => b.type === typeFilter); if (searchQuery) { const query = searchQuery.toLowerCase(); result = result.filter(b => b.name.toLowerCase().includes(query) || b.abbreviation.toLowerCase().includes(query) || b.mandate.toLowerCase().includes(query) || b.headquarters.toLowerCase().includes(query)); } return result; }, [typeFilter, searchQuery]);
  return (
    <div>
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-purple-400 mb-2">Space Regulatory Bodies Directory</h4><p className="text-sm text-slate-400">Comprehensive directory of international, regional, and national regulatory bodies governing space activities. From UN organizations to national licensing authorities and industry coordination groups.</p></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]"><label className="block text-slate-400 text-sm mb-1">Search</label><input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search bodies, functions..." className="w-full bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400" /></div>
        <div><label className="block text-slate-400 text-sm mb-1">Type</label><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Types</option><option value="un">UN Bodies</option><option value="national">National</option><option value="regional">Regional</option><option value="industry">Industry</option></select></div>
        {(typeFilter || searchQuery) && (<button onClick={() => { setTypeFilter(''); setSearchQuery(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{(Object.entries(BODY_TYPE_CONFIG) as [BodyType, typeof BODY_TYPE_CONFIG[BodyType]][]).map(([type, config]) => { const count = REGULATORY_BODIES.filter(b => b.type === type).length; return (<button key={type} onClick={() => setTypeFilter(typeFilter === type ? '' : type)} className={`card-elevated p-4 text-center transition-all cursor-pointer ${typeFilter === type ? 'ring-2 ring-nebula-500/50' : ''}`}><div className={`text-2xl font-bold font-display ${config.text}`}>{count}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">{config.label}</div></button>); })}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{filteredBodies.map((body) => (<BodyCard key={body.id} body={body} />))}</div>
    </div>
  );
}

// ############################################################################
// REGULATORY FILINGS SECTION COMPONENTS
// ############################################################################

function FilingsFCCTab() {
  const [search, setSearch] = useState(''); const [orbitFilter, setOrbitFilter] = useState(''); const [statusFilter, setStatusFilter] = useState('');
  const filtered = FCC_FILINGS.filter((f) => { if (orbitFilter && f.orbitType !== orbitFilter) return false; if (statusFilter && f.status !== statusFilter) return false; if (search) { const s = search.toLowerCase(); return f.applicant.toLowerCase().includes(s) || f.fileNumber.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s) || f.band.toLowerCase().includes(s); } return true; });
  const uniqueStatuses = Array.from(new Set(FCC_FILINGS.map((f) => f.status))); const uniqueOrbits = Array.from(new Set(FCC_FILINGS.map((f) => f.orbitType))); const totalSats = FCC_FILINGS.reduce((sum, f) => sum + (f.satelliteCount || 0), 0);
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{FCC_FILINGS.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Filings</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{FCC_FILINGS.filter((f) => f.status === 'granted').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Granted</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{FCC_FILINGS.filter((f) => f.status === 'pending').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Pending</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-cyan-400">{totalSats.toLocaleString()}</div><div className="text-star-300 text-xs uppercase tracking-widest">Satellites Filed</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="search" placeholder="Search applicant, file number, band..." aria-label="Search FCC filings" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
        <select value={orbitFilter} onChange={(e) => setOrbitFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Orbits</option>{uniqueOrbits.map((o) => (<option key={o} value={o}>{o}</option>))}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Statuses</option>{uniqueStatuses.map((s) => (<option key={s} value={s}>{(FILING_STATUS_STYLES[s] || DEFAULT_FILING_STATUS_STYLE).label}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} filings</span>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((filing) => { const statusStyle = FILING_STATUS_STYLES[filing.status] || DEFAULT_FILING_STATUS_STYLE; const orbitStyle = FILING_ORBIT_STYLES[filing.orbitType] || DEFAULT_FILING_ORBIT_STYLE; return (
        <div key={filing.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-base">{filing.applicant}</h4><span className="text-star-300 text-xs font-mono">{filing.fileNumber}</span></div><div className="flex items-center gap-2 shrink-0"><span className={`text-xs font-medium px-2 py-1 rounded ${orbitStyle.bg} ${orbitStyle.text}`}>{filing.orbitType}</span><span className={`text-xs font-medium px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span></div></div>
          <div className="flex items-center gap-4 mb-3 text-sm"><div><span className="text-star-300 text-xs block">Type</span><span className="text-white text-sm">{filing.filingType}</span></div><div><span className="text-star-300 text-xs block">Band</span><span className="text-nebula-300 text-sm font-mono">{filing.band}</span></div>{filing.satelliteCount && (<div><span className="text-star-300 text-xs block">Satellites</span><span className="text-white text-sm font-bold">{filing.satelliteCount.toLocaleString()}</span></div>)}</div>
          <p className="text-star-300 text-sm leading-relaxed mb-3">{filing.summary}</p>
          <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10"><span>Filed: <span className="text-white font-medium">{filing.dateFiled}</span></span>{filing.dateActedOn && (<><span className="text-slate-600">|</span><span>Acted: <span className="text-white font-medium">{filing.dateActedOn}</span></span></>)}{filing.docket && (<><span className="text-slate-600">|</span><span className="text-nebula-300 font-mono">{filing.docket}</span></>)}</div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No filings match your search</h3><button onClick={() => { setSearch(''); setOrbitFilter(''); setStatusFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function FilingsFAATab() {
  const [search, setSearch] = useState(''); const [typeFilter, setTypeFilter] = useState(''); const [statusFilter, setStatusFilter] = useState('');
  const filtered = FAA_LICENSES.filter((l) => { if (typeFilter && l.licenseType !== typeFilter) return false; if (statusFilter && l.status !== statusFilter) return false; if (search) { const s = search.toLowerCase(); return l.licensee.toLowerCase().includes(s) || l.vehicle.toLowerCase().includes(s) || l.launchSite.toLowerCase().includes(s) || l.licenseNumber.toLowerCase().includes(s); } return true; });
  const uniqueTypes = Array.from(new Set(FAA_LICENSES.map((l) => l.licenseType))); const uniqueStatuses = Array.from(new Set(FAA_LICENSES.map((l) => l.status))); const totalMissions = FAA_LICENSES.reduce((sum, l) => sum + l.missionsAuthorized, 0);
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{FAA_LICENSES.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Licenses</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{FAA_LICENSES.filter((l) => l.status === 'active').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Active</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{FAA_LICENSES.filter((l) => l.status === 'pending').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Pending</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-cyan-400">{totalMissions}</div><div className="text-star-300 text-xs uppercase tracking-widest">Missions Auth.</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="search" placeholder="Search licensee, vehicle, launch site..." aria-label="Search FAA licenses" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Statuses</option>{uniqueStatuses.map((s) => (<option key={s} value={s}>{(FILING_STATUS_STYLES[s] || DEFAULT_FILING_STATUS_STYLE).label}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} licenses</span>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((license) => { const statusStyle = FILING_STATUS_STYLES[license.status] || DEFAULT_FILING_STATUS_STYLE; return (
        <div key={license.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex-1 min-w-0"><h4 className="font-semibold text-white text-base">{license.licensee}</h4><span className="text-star-300 text-xs font-mono">{license.licenseNumber}</span></div><div className="flex items-center gap-2 shrink-0"><span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-400">{license.licenseType}</span><span className={`text-xs font-medium px-2 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span></div></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3"><div><span className="text-star-300 text-xs block">Vehicle</span><span className="text-white text-sm font-medium">{license.vehicle}</span></div><div><span className="text-star-300 text-xs block">Launch Site</span><span className="text-nebula-300 text-sm">{license.launchSite}</span></div>{license.missionsAuthorized > 0 && (<div><span className="text-star-300 text-xs block">Missions</span><span className="text-white text-sm font-bold">{license.missionsAuthorized}</span></div>)}</div>
          <p className="text-star-300 text-sm leading-relaxed mb-3">{license.summary}</p>
          <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10"><span>Issued: <span className="text-white font-medium">{license.dateIssued}</span></span><span className="text-slate-600">|</span><span>Expires: <span className="text-white font-medium">{license.expirationDate}</span></span></div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No licenses match your search</h3><button onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function FilingsITUTab() {
  const [search, setSearch] = useState(''); const [orbitFilter, setOrbitFilter] = useState(''); const [typeFilter, setTypeFilter] = useState('');
  const filtered = ITU_FILINGS.filter((f) => { if (orbitFilter && f.orbitType !== orbitFilter) return false; if (typeFilter && f.filingType !== typeFilter) return false; if (search) { const s = search.toLowerCase(); return f.networkName.toLowerCase().includes(s) || f.administration.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s); } return true; });
  const uniqueTypes = Array.from(new Set(ITU_FILINGS.map((f) => f.filingType))); const uniqueOrbits = Array.from(new Set(ITU_FILINGS.map((f) => f.orbitType))); const totalSats = ITU_FILINGS.reduce((sum, f) => sum + (f.satellites || 0), 0);
  return (
    <div>
      <div className="card p-5 mb-6 border border-purple-500/20"><h3 className="text-white font-semibold mb-2">ITU Radio Regulations Filings</h3><p className="text-star-300 text-sm leading-relaxed">Satellite network filings under the ITU Radio Regulations. Includes Article 9 coordination requests, Appendix 30/30A/30B plan filings, Article 11 notifications, and due diligence submissions.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{ITU_FILINGS.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Network Filings</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-purple-400">{Array.from(new Set(ITU_FILINGS.map((f) => f.administration))).length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Administrations</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-cyan-400">{totalSats.toLocaleString()}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Satellites</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{ITU_FILINGS.filter((f) => f.status === 'active').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Active Filings</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="search" placeholder="Search network name, administration..." aria-label="Search ITU filings" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
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

function FilingsSECTab() {
  const [search, setSearch] = useState(''); const [typeFilter, setTypeFilter] = useState(''); const [companyFilter, setCompanyFilter] = useState('');
  const filtered = SEC_FILINGS.filter((f) => { if (typeFilter && f.filingType !== typeFilter) return false; if (companyFilter && f.ticker !== companyFilter) return false; if (search) { const s = search.toLowerCase(); return f.company.toLowerCase().includes(s) || f.ticker.toLowerCase().includes(s) || f.summary.toLowerCase().includes(s); } return true; });
  const uniqueTypes = Array.from(new Set(SEC_FILINGS.map((f) => f.filingType))); const uniqueTickers = Array.from(new Set(SEC_FILINGS.map((f) => f.ticker)));
  const filingTypeColors: Record<string, { bg: string; text: string }> = { '10-K': { bg: 'bg-blue-500/20', text: 'text-blue-400' }, '10-Q': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' }, '8-K': { bg: 'bg-orange-500/20', text: 'text-orange-400' }, 'S-1': { bg: 'bg-green-500/20', text: 'text-green-400' }, 'DEF 14A': { bg: 'bg-purple-500/20', text: 'text-purple-400' }, '13F': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' }, 'SC 13D': { bg: 'bg-red-500/20', text: 'text-red-400' } };
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{SEC_FILINGS.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Filings</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-blue-400">{SEC_FILINGS.filter((f) => f.filingType === '10-K').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Annual Reports</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-orange-400">{SEC_FILINGS.filter((f) => f.filingType === '8-K').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Current Reports</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-purple-400">{uniqueTickers.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Companies</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="search" placeholder="Search company, ticker, content..." aria-label="Search SEC filings" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Companies</option>{uniqueTickers.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Filing Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} filings</span>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map((filing) => { const typeColor = filingTypeColors[filing.filingType] || { bg: 'bg-slate-800/500/20', text: 'text-slate-400' }; return (
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

function FilingsFederalRegisterTab() {
  const [search, setSearch] = useState(''); const [agencyFilter, setAgencyFilter] = useState(''); const [typeFilter, setTypeFilter] = useState(''); const [impactFilter, setImpactFilter] = useState('');
  const filtered = FEDERAL_REGISTER_ENTRIES.filter((e) => { if (agencyFilter && e.agency !== agencyFilter) return false; if (typeFilter && e.documentType !== typeFilter) return false; if (impactFilter && e.impact !== impactFilter) return false; if (search) { const s = search.toLowerCase(); return e.title.toLowerCase().includes(s) || e.agency.toLowerCase().includes(s) || e.summary.toLowerCase().includes(s); } return true; });
  const uniqueAgencies = Array.from(new Set(FEDERAL_REGISTER_ENTRIES.map((e) => e.agency))); const uniqueTypes = Array.from(new Set(FEDERAL_REGISTER_ENTRIES.map((e) => e.documentType)));
  const docTypeColors: Record<string, { bg: string; text: string }> = { 'Proposed Rule': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' }, 'Final Rule': { bg: 'bg-green-500/20', text: 'text-green-400' }, 'Notice': { bg: 'bg-blue-500/20', text: 'text-blue-400' }, 'Presidential Document': { bg: 'bg-purple-500/20', text: 'text-purple-400' }, 'Request for Comment': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' } };
  const openForComment = FEDERAL_REGISTER_ENTRIES.filter((e) => { if (!e.commentDeadline) return false; return new Date(e.commentDeadline) > new Date(); });
  return (
    <div>
      {openForComment.length > 0 && (<div className="card p-5 mb-6 border border-yellow-500/30 bg-yellow-500/5"><h3 className="text-yellow-400 font-semibold mb-3">Open Comment Periods</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{openForComment.map((entry) => (<div key={entry.id} className="card p-3"><div className="flex items-center justify-between mb-1"><span className="text-xs font-bold text-nebula-300">{entry.agency}</span><span className="text-xs text-yellow-400">Due: {entry.commentDeadline}</span></div><p className="text-sm text-white line-clamp-2">{entry.title}</p></div>))}</div></div>)}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{FEDERAL_REGISTER_ENTRIES.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Entries</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{FEDERAL_REGISTER_ENTRIES.filter((e) => e.documentType === 'Final Rule').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Final Rules</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{FEDERAL_REGISTER_ENTRIES.filter((e) => e.documentType === 'Proposed Rule').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Proposed Rules</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-red-400">{FEDERAL_REGISTER_ENTRIES.filter((e) => e.impact === 'high').length}</div><div className="text-star-300 text-xs uppercase tracking-widest">High Impact</div></div>
      </div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="search" placeholder="Search title, agency, content..." aria-label="Search Federal Register entries" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Agencies</option>{uniqueAgencies.map((a) => (<option key={a} value={a}>{a}</option>))}</select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={impactFilter} onChange={(e) => setImpactFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Impact Levels</option><option value="high">High Impact</option><option value="medium">Medium Impact</option><option value="low">Low Impact</option></select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} entries</span>
      </div></div>
      <div className="space-y-4">{filtered.map((entry) => { const typeColor = docTypeColors[entry.documentType] || { bg: 'bg-slate-800/500/20', text: 'text-slate-400' }; const impactStyle = FILING_IMPACT_STYLES[entry.impact] || DEFAULT_FILING_IMPACT_STYLE; return (
        <div key={entry.id} className="card p-5 hover:border-nebula-500/50 transition-all">
          <div className="flex items-start justify-between mb-3 gap-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-nebula-300 shrink-0">{entry.agency}</div><div><h4 className="font-semibold text-white text-base">{entry.title}</h4><span className="text-star-300 text-xs font-mono">FR {entry.federalRegisterNumber}</span></div></div><div className="flex items-center gap-2 shrink-0"><span className={`text-xs font-medium px-2 py-1 rounded ${typeColor.bg} ${typeColor.text}`}>{entry.documentType}</span><span className={`text-xs font-medium px-2 py-1 rounded ${impactStyle.bg} ${impactStyle.text}`}>{entry.impact.charAt(0).toUpperCase() + entry.impact.slice(1)} Impact</span></div></div>
          <p className="text-star-300 text-sm leading-relaxed mb-3">{entry.summary}</p>
          <div className="flex items-center flex-wrap gap-4 text-xs text-star-300 pt-3 border-t border-white/10"><span>Published: <span className="text-white font-medium">{entry.publishedDate}</span></span>{entry.effectiveDate && (<><span className="text-slate-600">|</span><span>Effective: <span className="text-white font-medium">{entry.effectiveDate}</span></span></>)}{entry.commentDeadline && (<><span className="text-slate-600">|</span><span className={new Date(entry.commentDeadline) > new Date() ? 'text-yellow-400 font-semibold' : 'text-star-300'}>Comments Due: {entry.commentDeadline}</span></>)}{entry.docket && (<><span className="text-slate-600">|</span><span className="text-nebula-300 font-mono">{entry.docket}</span></>)}</div>
        </div>); })}</div>
      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No entries match your search</h3><button onClick={() => { setSearch(''); setAgencyFilter(''); setTypeFilter(''); setImpactFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

// ############################################################################
// BID PROTESTS & CLAIMS - Types, Status Configs, and Data
// ############################################################################

type ProtestOutcome = 'denied' | 'sustained' | 'dismissed' | 'withdrawn' | 'corrective_action' | 'settled';
type ProtestForum = 'gao' | 'cofc' | 'dc_circuit' | 'district_court';
type ProtestProgram = 'launch' | 'satellite' | 'crewed' | 'science' | 'defense' | 'iss';

interface BidProtest {
  id: string;
  title: string;
  shortTitle: string;
  caseNumber: string;
  forum: ProtestForum;
  outcome: ProtestOutcome;
  program: ProtestProgram;
  protester: string;
  awardee: string;
  agency: string;
  contractValue: string;
  yearFiled: number;
  yearDecided: number;
  decisionDate: string;
  judge?: string;
  description: string;
  significance: string;
  keyFindings: string[];
}

const DEFAULT_PROTEST_STYLE = { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Unknown' };

const PROTEST_OUTCOME_STYLES: Record<ProtestOutcome, { bg: string; text: string; label: string }> = {
  denied: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Denied' },
  sustained: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Sustained' },
  dismissed: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Dismissed' },
  withdrawn: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Withdrawn' },
  corrective_action: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Corrective Action' },
  settled: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Settled' },
};

const PROTEST_FORUM_STYLES: Record<ProtestForum, { bg: string; text: string; label: string }> = {
  gao: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'GAO' },
  cofc: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'COFC' },
  dc_circuit: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'D.C. Circuit' },
  district_court: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'District Court' },
};

const PROTEST_PROGRAM_LABELS: Record<ProtestProgram, string> = {
  launch: 'Launch Services',
  satellite: 'Satellite Systems',
  crewed: 'Crewed Spaceflight',
  science: 'Science Missions',
  defense: 'National Security Space',
  iss: 'ISS Operations',
};

let BID_PROTESTS: BidProtest[] = [];
function ProtestsOverviewTab() {
  const [search, setSearch] = useState('');
  const [forumFilter, setForumFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return BID_PROTESTS
      .filter((p) => {
        if (forumFilter && p.forum !== forumFilter) return false;
        if (outcomeFilter && p.outcome !== outcomeFilter) return false;
        if (programFilter && p.program !== programFilter) return false;
        if (agencyFilter && p.agency !== agencyFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          return p.title.toLowerCase().includes(s) || p.shortTitle.toLowerCase().includes(s) || p.caseNumber.toLowerCase().includes(s) || p.protester.toLowerCase().includes(s) || p.awardee.toLowerCase().includes(s) || p.description.toLowerCase().includes(s);
        }
        return true;
      })
      .sort((a, b) => b.yearDecided - a.yearDecided || b.yearFiled - a.yearFiled);
  }, [search, forumFilter, outcomeFilter, programFilter, agencyFilter]);

  const uniqueForums = Array.from(new Set(BID_PROTESTS.map((p) => p.forum)));
  const uniqueOutcomes = Array.from(new Set(BID_PROTESTS.map((p) => p.outcome)));
  const uniquePrograms = Array.from(new Set(BID_PROTESTS.map((p) => p.program)));
  const uniqueAgencies = Array.from(new Set(BID_PROTESTS.map((p) => p.agency)));

  const deniedCount = BID_PROTESTS.filter((p) => p.outcome === 'denied').length;
  const sustainedCount = BID_PROTESTS.filter((p) => p.outcome === 'sustained').length;
  const correctiveCount = BID_PROTESTS.filter((p) => p.outcome === 'corrective_action').length;
  const gaoCount = BID_PROTESTS.filter((p) => p.forum === 'gao').length;
  const cofcCount = BID_PROTESTS.filter((p) => p.forum === 'cofc').length;

  return (
    <div>
      <div className="card p-5 mb-6 border border-amber-500/20 bg-amber-500/5">
        <h3 className="text-white font-semibold mb-2">Space Industry Bid Protests & Claims Database</h3>
        <p className="text-star-300 text-sm leading-relaxed">Tracking major bid protests and procurement challenges in the U.S. space industry. Includes GAO protests, Court of Federal Claims (COFC) litigation, and appellate decisions affecting NASA, DoD, and other agency space procurements.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-white">{BID_PROTESTS.length}</div><div className="text-star-300 text-xs uppercase tracking-widest">Total Protests</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-red-400">{deniedCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">Denied</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{sustainedCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">Sustained</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-blue-400">{correctiveCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">Corrective Action</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-purple-400">{gaoCount} / {cofcCount}</div><div className="text-star-300 text-xs uppercase tracking-widest">GAO / COFC</div></div>
      </div>

      <div className="card p-4 mb-6"><div className="flex flex-wrap items-center gap-3">
        <input type="search" placeholder="Search case, protester, awardee..." aria-label="Search bid protests" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none" />
        <select value={forumFilter} onChange={(e) => setForumFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Forums</option>{uniqueForums.map((f) => (<option key={f} value={f}>{(PROTEST_FORUM_STYLES[f] || DEFAULT_PROTEST_STYLE).label}</option>))}</select>
        <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Outcomes</option>{uniqueOutcomes.map((o) => (<option key={o} value={o}>{(PROTEST_OUTCOME_STYLES[o] || DEFAULT_PROTEST_STYLE).label}</option>))}</select>
        <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Programs</option>{uniquePrograms.map((p) => (<option key={p} value={p}>{PROTEST_PROGRAM_LABELS[p]}</option>))}</select>
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"><option value="">All Agencies</option>{uniqueAgencies.map((a) => (<option key={a} value={a}>{a}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} cases</span>
      </div></div>

      <div className="space-y-4">{filtered.map((protest) => {
        const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome] || DEFAULT_PROTEST_STYLE;
        const forumStyle = PROTEST_FORUM_STYLES[protest.forum] || DEFAULT_PROTEST_STYLE;
        const isExpanded = expandedId === protest.id;
        return (
          <div key={protest.id} className="card p-5 hover:border-nebula-500/50 transition-all">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-base">{protest.shortTitle}</h4>
                <span className="text-star-300 text-xs font-mono">{protest.caseNumber}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded ${forumStyle.bg} ${forumStyle.text}`}>{forumStyle.label}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${outcomeStyle.bg} ${outcomeStyle.text}`}>{outcomeStyle.label}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div><span className="text-star-300 text-xs block">Protester</span><span className="text-white text-sm font-medium">{protest.protester}</span></div>
              <div><span className="text-star-300 text-xs block">Awardee</span><span className="text-nebula-300 text-sm">{protest.awardee}</span></div>
              <div><span className="text-star-300 text-xs block">Agency</span><span className="text-white text-sm">{protest.agency}</span></div>
              <div><span className="text-star-300 text-xs block">Contract Value</span><span className="text-white text-sm font-bold">{protest.contractValue}</span></div>
            </div>
            <p className="text-star-300 text-sm leading-relaxed mb-3">{protest.description}</p>
            <button onClick={() => setExpandedId(isExpanded ? null : protest.id)} className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors mb-2">{isExpanded ? 'Show Less' : 'View Key Findings & Significance'}</button>
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                <div><h5 className="text-xs font-semibold text-star-300 mb-2 uppercase tracking-wider">Key Findings</h5><ul className="space-y-1.5">{protest.keyFindings.map((finding, i) => (<li key={i} className="flex items-start gap-2 text-xs text-star-300"><svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{finding}</li>))}</ul></div>
                <div><h5 className="text-xs font-semibold text-star-300 mb-1 uppercase tracking-wider">Significance</h5><p className="text-xs text-star-300">{protest.significance}</p></div>
                <div className="text-xs text-star-300">
                  <span className="font-medium text-white">{protest.title}</span>
                  <span className="mx-2 text-slate-600">|</span>
                  <span>Program: <span className="text-nebula-300">{PROTEST_PROGRAM_LABELS[protest.program]}</span></span>
                  {protest.judge && (<><span className="mx-2 text-slate-600">|</span><span>{protest.judge}</span></>)}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10 mt-3">
              <span>Filed: <span className="text-white font-medium">{protest.yearFiled}</span></span>
              <span className="text-slate-600">|</span>
              <span>Decided: <span className="text-white font-medium">{protest.decisionDate}</span></span>
              <span className="text-slate-600">|</span>
              <span className="text-nebula-300">{PROTEST_PROGRAM_LABELS[protest.program]}</span>
            </div>
          </div>
        );
      })}</div>

      {filtered.length === 0 && (<div className="text-center py-20"><h3 className="text-xl font-semibold text-white mb-2">No protests match your search</h3><button onClick={() => { setSearch(''); setForumFilter(''); setOutcomeFilter(''); setProgramFilter(''); setAgencyFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button></div>)}
    </div>
  );
}

function ProtestsTimelineTab() {
  const years = useMemo(() => {
    const allYears = Array.from(new Set(BID_PROTESTS.map((p) => p.yearDecided))).sort((a, b) => b - a);
    return allYears;
  }, []);

  const protestsByYear = useMemo(() => {
    const grouped: Record<number, BidProtest[]> = {};
    for (const protest of BID_PROTESTS) {
      if (!grouped[protest.yearDecided]) grouped[protest.yearDecided] = [];
      grouped[protest.yearDecided].push(protest);
    }
    return grouped;
  }, []);

  const outcomeColors: Record<ProtestOutcome, string> = {
    denied: 'bg-red-400',
    sustained: 'bg-green-400',
    dismissed: 'bg-slate-400',
    withdrawn: 'bg-yellow-400',
    corrective_action: 'bg-blue-400',
    settled: 'bg-purple-400',
  };

  return (
    <div>
      <div className="card p-5 mb-6 border border-cyan-500/20 bg-cyan-500/5">
        <h3 className="text-white font-semibold mb-2">Protest Timeline</h3>
        <p className="text-star-300 text-sm leading-relaxed">Chronological view of space industry bid protests grouped by decision year, with color-coded outcome indicators.</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(PROTEST_OUTCOME_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${outcomeColors[key as ProtestOutcome]}`} />
            <span className="text-xs text-star-300">{style.label}</span>
          </div>
        ))}
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />
        {years.map((year) => (
          <div key={year} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-nebula-500 flex items-center justify-center text-white text-xs font-bold relative z-10">{protestsByYear[year].length}</div>
              <h3 className="text-xl font-bold font-display text-white">{year}</h3>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="ml-12 space-y-3">
              {protestsByYear[year].sort((a, b) => {
                const monthA = new Date(a.decisionDate).getTime();
                const monthB = new Date(b.decisionDate).getTime();
                return (isNaN(monthB) ? 0 : monthB) - (isNaN(monthA) ? 0 : monthA);
              }).map((protest) => {
                const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome] || DEFAULT_PROTEST_STYLE;
                const forumStyle = PROTEST_FORUM_STYLES[protest.forum] || DEFAULT_PROTEST_STYLE;
                return (
                  <div key={protest.id} className="card p-4 hover:border-nebula-500/50 transition-all relative">
                    <div className={`absolute left-[-28px] top-4 w-3 h-3 rounded-full ${outcomeColors[protest.outcome]} border-2 border-slate-900`} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm">{protest.shortTitle}</h4>
                        <p className="text-star-300 text-xs mt-1">{protest.protester} vs. {protest.awardee}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${forumStyle.bg} ${forumStyle.text}`}>{forumStyle.label}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${outcomeStyle.bg} ${outcomeStyle.text}`}>{outcomeStyle.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-star-300">
                      <span>{protest.caseNumber}</span>
                      <span className="text-slate-600">|</span>
                      <span>{protest.agency}</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-white font-medium">{protest.contractValue}</span>
                      <span className="text-slate-600">|</span>
                      <span>{protest.decisionDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtestsAnalysisTab() {
  const totalProtests = BID_PROTESTS.length;
  const gaoCases = BID_PROTESTS.filter((p) => p.forum === 'gao');
  const cofcCases = BID_PROTESTS.filter((p) => p.forum === 'cofc');

  const gaoSuccessRate = gaoCases.length > 0
    ? Math.round((gaoCases.filter((p) => p.outcome === 'sustained' || p.outcome === 'corrective_action').length / gaoCases.length) * 100)
    : 0;
  const cofcSuccessRate = cofcCases.length > 0
    ? Math.round((cofcCases.filter((p) => p.outcome === 'sustained' || p.outcome === 'corrective_action').length / cofcCases.length) * 100)
    : 0;

  const byProgram = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of BID_PROTESTS) {
      counts[p.program] = (counts[p.program] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, []);

  const byAgency = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of BID_PROTESTS) {
      counts[p.agency] = (counts[p.agency] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, []);

  const byOutcome = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of BID_PROTESTS) {
      counts[p.outcome] = (counts[p.outcome] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, []);

  const yearRange = useMemo(() => {
    const years = Array.from(new Set(BID_PROTESTS.map((p) => p.yearDecided))).sort();
    return years;
  }, []);

  const volumeByYear = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const year of yearRange) counts[year] = 0;
    for (const p of BID_PROTESTS) counts[p.yearDecided] = (counts[p.yearDecided] || 0) + 1;
    return counts;
  }, [yearRange]);

  const maxVolume = Math.max(...Object.values(volumeByYear));

  return (
    <div>
      <div className="card p-5 mb-6 border border-purple-500/20 bg-purple-500/5">
        <h3 className="text-white font-semibold mb-2">Analysis & Trends</h3>
        <p className="text-star-300 text-sm leading-relaxed">Statistical analysis of space industry bid protests, including success rates by forum, protest volume trends, and common grounds for challenge.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">GAO Success Rate</h4>
          <div className="text-center mb-3">
            <div className="text-4xl font-bold font-display text-blue-400">{gaoSuccessRate}%</div>
            <p className="text-xs text-star-300 mt-1">Sustained or Corrective Action</p>
          </div>
          <div className="text-xs text-star-300 text-center">{gaoCases.length} cases filed at GAO</div>
          <div className="h-2 bg-white/5 rounded-full mt-3 overflow-hidden"><div className="h-full bg-blue-400 rounded-full" style={{ width: `${gaoSuccessRate}%` }} /></div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">COFC Success Rate</h4>
          <div className="text-center mb-3">
            <div className="text-4xl font-bold font-display text-purple-400">{cofcSuccessRate}%</div>
            <p className="text-xs text-star-300 mt-1">Sustained or Corrective Action</p>
          </div>
          <div className="text-xs text-star-300 text-center">{cofcCases.length} cases filed at COFC</div>
          <div className="h-2 bg-white/5 rounded-full mt-3 overflow-hidden"><div className="h-full bg-purple-400 rounded-full" style={{ width: `${cofcSuccessRate}%` }} /></div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">Overall Protest Effectiveness</h4>
          <div className="text-center mb-3">
            <div className="text-4xl font-bold font-display text-white">
              {totalProtests > 0 ? Math.round((BID_PROTESTS.filter((p) => p.outcome === 'sustained' || p.outcome === 'corrective_action').length / totalProtests) * 100) : 0}%
            </div>
            <p className="text-xs text-star-300 mt-1">Result in Protester-Favorable Outcome</p>
          </div>
          <div className="text-xs text-star-300 text-center">{totalProtests} total protests tracked</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">Protest Volume by Year</h4>
          <div className="space-y-2">
            {yearRange.map((year) => (
              <div key={year} className="flex items-center gap-3">
                <span className="text-xs text-star-300 w-10 text-right font-mono">{year}</span>
                <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-nebula-500 to-cyan-400 rounded flex items-center justify-end pr-2" style={{ width: `${(volumeByYear[year] / maxVolume) * 100}%` }}>
                    <span className="text-xs text-white font-bold">{volumeByYear[year]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">Outcomes Breakdown</h4>
          <div className="space-y-3">
            {byOutcome.map(([outcome, count]) => {
              const style = PROTEST_OUTCOME_STYLES[outcome as ProtestOutcome] || DEFAULT_PROTEST_STYLE;
              const pct = totalProtests > 0 ? Math.round((count / totalProtests) * 100) : 0;
              return (
                <div key={outcome}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
                    <span className="text-xs text-star-300">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${style.bg.replace('/20', '/60')}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">By Program Area</h4>
          <div className="space-y-2">
            {byProgram.map(([program, count]) => (
              <div key={program} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{PROTEST_PROGRAM_LABELS[program as ProtestProgram]}</span>
                <span className="text-sm font-bold text-nebula-300">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">By Agency</h4>
          <div className="space-y-2">
            {byAgency.map(([agency, count]) => (
              <div key={agency} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{agency}</span>
                <span className="text-sm font-bold text-nebula-300">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-elevated p-5">
        <h4 className="text-sm font-semibold text-star-300 uppercase tracking-wider mb-4">All Cases Summary</h4>
        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Case</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Forum</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Outcome</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Protester</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Agency</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Value</th>
                <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-wider font-medium">Year</th>
              </tr>
            </thead>
            <tbody>
              {BID_PROTESTS.sort((a, b) => b.yearDecided - a.yearDecided).map((protest) => {
                const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome] || DEFAULT_PROTEST_STYLE;
                const forumStyle = PROTEST_FORUM_STYLES[protest.forum] || DEFAULT_PROTEST_STYLE;
                return (
                  <tr key={protest.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3"><span className="text-white font-medium">{protest.shortTitle}</span><br /><span className="text-star-300 text-xs font-mono">{protest.caseNumber}</span></td>
                    <td className="py-2.5 px-3"><span className={`text-xs font-medium px-2 py-0.5 rounded ${forumStyle.bg} ${forumStyle.text}`}>{forumStyle.label}</span></td>
                    <td className="py-2.5 px-3"><span className={`text-xs font-medium px-2 py-0.5 rounded ${outcomeStyle.bg} ${outcomeStyle.text}`}>{outcomeStyle.label}</span></td>
                    <td className="py-2.5 px-3 text-star-300">{protest.protester}</td>
                    <td className="py-2.5 px-3 text-star-300">{protest.agency}</td>
                    <td className="py-2.5 px-3 text-white font-medium">{protest.contractValue}</td>
                    <td className="py-2.5 px-3 text-star-300">{protest.yearDecided}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {BID_PROTESTS.sort((a, b) => b.yearDecided - a.yearDecided).map((protest) => {
            const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome] || DEFAULT_PROTEST_STYLE;
            const forumStyle = PROTEST_FORUM_STYLES[protest.forum] || DEFAULT_PROTEST_STYLE;
            return (
              <div key={protest.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-medium text-sm truncate">{protest.shortTitle}</div>
                    <div className="text-star-300 text-xs font-mono">{protest.caseNumber}</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${outcomeStyle.bg} ${outcomeStyle.text}`}>{outcomeStyle.label}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-star-300/70">Forum</span>
                    <span className={`font-medium px-2 py-0.5 rounded ${forumStyle.bg} ${forumStyle.text}`}>{forumStyle.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-star-300/70">Protester</span>
                    <span className="text-star-300 truncate ml-2">{protest.protester}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-star-300/70">Agency</span>
                    <span className="text-star-300">{protest.agency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-star-300/70">Value</span>
                    <span className="text-white font-medium">{protest.contractValue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-star-300/70">Year</span>
                    <span className="text-star-300">{protest.yearDecided}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ############################################################################
// QUICK REFERENCE - Regulatory Bodies, Key Regulations, Compliance Checklists
// ############################################################################

type RegulatoryBodyRefCategory = 'us_licensing' | 'international' | 'export_control';

interface RegulatoryBodyRef {
  id: string;
  name: string;
  abbreviation: string;
  category: RegulatoryBodyRefCategory;
  jurisdiction: string;
  primaryFunction: string;
  description: string;
  keyResponsibilities: string[];
  spaceRelevance: string;
  website: string;
  contactInfo: string;
  recentDevelopments: string[];
}

type RegulationCategory = 'international_treaty' | 'us_export_control' | 'us_licensing_rule';

interface KeyRegulation {
  id: string;
  name: string;
  shortName: string;
  category: RegulationCategory;
  year: number;
  authority: string;
  cfrReference?: string;
  description: string;
  keyProvisions: string[];
  applicability: string;
  penalties: string;
  recentAmendments: string[];
  furtherReading: string;
}

type ChecklistActivityId = 'launch_satellite' | 'ground_station' | 'export_hardware' | 'space_tourism' | 'remote_sensing' | 'spectrum_use';

interface ComplianceChecklistItem {
  step: number;
  agency: string;
  requirement: string;
  description: string;
  estimatedTimeline: string;
  estimatedCost: string;
  notes?: string;
}

interface ComplianceChecklist {
  id: ChecklistActivityId;
  activity: string;
  description: string;
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  totalEstimatedTimeline: string;
  steps: ComplianceChecklistItem[];
  tips: string[];
  commonPitfalls: string[];
}

const REGULATORY_BODY_REF_CATEGORY_CONFIG: Record<RegulatoryBodyRefCategory, { label: string; bg: string; text: string; border: string }> = {
  us_licensing: { label: 'US Licensing', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  international: { label: 'International', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  export_control: { label: 'Export Control', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

const REGULATION_CATEGORY_CONFIG: Record<RegulationCategory, { label: string; bg: string; text: string; border: string }> = {
  international_treaty: { label: 'International Treaty', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  us_export_control: { label: 'US Export Control', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  us_licensing_rule: { label: 'US Licensing Rule', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
};

const CHECKLIST_COMPLEXITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'Low Complexity', bg: 'bg-green-500/20', text: 'text-green-400' },
  medium: { label: 'Medium Complexity', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  high: { label: 'High Complexity', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  very_high: { label: 'Very High Complexity', bg: 'bg-red-500/20', text: 'text-red-400' },
};

const KEY_REGULATORY_BODIES: RegulatoryBodyRef[] = [
  {
    id: 'fcc',
    name: 'Federal Communications Commission',
    abbreviation: 'FCC',
    category: 'us_licensing',
    jurisdiction: 'United States',
    primaryFunction: 'Spectrum allocation and satellite communications licensing',
    description: 'The FCC regulates interstate and international communications by radio, television, wire, satellite, and cable. Its Space Bureau (established 2023) handles satellite licensing, spectrum allocation for space services, orbital debris mitigation rules, and coordination of satellite constellations.',
    keyResponsibilities: [
      'Satellite system licensing and authorization (Part 25)',
      'Spectrum allocation for space-to-Earth and Earth-to-space services',
      'Orbital debris mitigation requirements (25-year deorbit rule)',
      'Market access for non-US satellite operators',
      'Interference coordination between satellite operators',
      'Small satellite streamlined licensing process',
    ],
    spaceRelevance: 'Any entity operating or communicating with satellites from US territory must hold FCC authorization. The FCC also sets technical standards for satellite systems and enforces spectrum sharing rules critical to avoiding interference.',
    website: 'https://www.fcc.gov/space',
    contactInfo: 'Space Bureau: (202) 418-0300',
    recentDevelopments: [
      'Established dedicated Space Bureau in 2023 to handle growing satellite licensing workload',
      'Adopted 5-year post-mission deorbit rule replacing the prior 25-year guideline (2022)',
      'Streamlined processing for small satellite and NGSO constellation applications',
      'Updated spectrum sharing framework for Ka-band NGSO systems',
    ],
  },
  {
    id: 'faa-ast',
    name: 'Federal Aviation Administration / Office of Commercial Space Transportation',
    abbreviation: 'FAA/AST',
    category: 'us_licensing',
    jurisdiction: 'United States',
    primaryFunction: 'Commercial space launch and reentry vehicle licensing',
    description: 'The FAA\'s Office of Commercial Space Transportation (AST) licenses and regulates US commercial space launch and reentry activities including launch vehicles, reentry vehicles, launch sites, and reentry sites. Updated Part 450 regulations (effective March 2021) consolidated and modernized the licensing framework.',
    keyResponsibilities: [
      'Launch and reentry vehicle operator licensing (14 CFR Part 450)',
      'Launch and reentry site licensing',
      'Safety review and approval for commercial launches',
      'Financial responsibility (insurance) requirements',
      'Environmental review under NEPA for launch operations',
      'Human space flight informed consent requirements',
    ],
    spaceRelevance: 'All commercial launches and reentries from US territory or by US citizens anywhere in the world require FAA/AST authorization. This includes suborbital space tourism flights, orbital launches, and experimental vehicle flights.',
    website: 'https://www.faa.gov/space',
    contactInfo: 'AST Main Office: (202) 267-7793',
    recentDevelopments: [
      'Part 450 streamlined licensing replaced legacy Part 431/435/437 framework (2021)',
      'Increased launch tempo processing with record 131 licensed launches in 2024',
      'Updated human space flight waiver of claims requirements',
      'Expanded environmental review streamlining for frequently used launch sites',
    ],
  },
  {
    id: 'itu',
    name: 'International Telecommunication Union',
    abbreviation: 'ITU',
    category: 'international',
    jurisdiction: 'Global (UN specialized agency)',
    primaryFunction: 'International frequency coordination and orbital slot allocation',
    description: 'The ITU is a UN specialized agency responsible for global coordination of radio spectrum and satellite orbits. Its Radiocommunication Sector (ITU-R) manages the international frequency allocation table, coordinates satellite network filings, and maintains the Master International Frequency Register for space services.',
    keyResponsibilities: [
      'International frequency allocation and spectrum management (Radio Regulations)',
      'Satellite network coordination (Article 9 procedures)',
      'Geostationary orbit slot assignment and coordination',
      'Due diligence requirements for satellite network filings',
      'World Radiocommunication Conferences (WRC) every 3-4 years',
      'Resolution of harmful interference between satellite systems',
    ],
    spaceRelevance: 'Before launching any satellite, operators must coordinate through their national administration to the ITU to ensure non-interference with existing services. GSO slot assignments and NGSO coordination are essential for constellation deployment.',
    website: 'https://www.itu.int/en/ITU-R',
    contactInfo: 'ITU Radiocommunication Bureau: +41 22 730 5800',
    recentDevelopments: [
      'WRC-23 outcomes: new spectrum allocations for satellite broadband and Earth exploration',
      'Updated milestone-based approach for NGSO constellation filings',
      'Enhanced due diligence requirements to prevent spectrum warehousing',
      'New framework for coordination between NGSO mega-constellations',
    ],
  },
  {
    id: 'noaa',
    name: 'National Oceanic and Atmospheric Administration',
    abbreviation: 'NOAA',
    category: 'us_licensing',
    jurisdiction: 'United States',
    primaryFunction: 'Remote sensing satellite licensing and space commerce',
    description: 'NOAA\'s Office of Space Commerce licenses private remote sensing space systems under the Land Remote Sensing Policy Act. The office is also developing a space traffic management framework and serves as the civil agency focal point for commercial space situational awareness.',
    keyResponsibilities: [
      'Remote sensing satellite system licensing (15 CFR Part 960)',
      'Monitoring compliance with remote sensing license conditions',
      'Space situational awareness data sharing',
      'Open Architecture Data Repository (OADR) for SSA',
      'Commercial weather data pilot programs',
      'Space commerce policy coordination',
    ],
    spaceRelevance: 'Any US entity operating Earth observation or remote sensing satellites needs NOAA licensing. This includes optical, radar (SAR), hyperspectral, and other imaging payloads. License conditions address shutter control, data distribution, and national security.',
    website: 'https://space.commerce.gov',
    contactInfo: 'Office of Space Commerce: (202) 482-6125',
    recentDevelopments: [
      'Modernized Part 960 remote sensing licensing regulations (2020) with tiered authorization',
      'Developing Open Architecture Data Repository for space traffic coordination',
      'Taking over civil space situational awareness mission from DoD',
      'Expanded commercial weather data purchasing programs',
    ],
  },
  {
    id: 'bis',
    name: 'Bureau of Industry and Security',
    abbreviation: 'BIS',
    category: 'export_control',
    jurisdiction: 'United States',
    primaryFunction: 'Export controls for dual-use technologies (EAR)',
    description: 'BIS, within the US Department of Commerce, administers the Export Administration Regulations (EAR) controlling dual-use items including commercial satellites and components. Since 2014, most commercial satellites were transferred from the USML (ITAR) to the Commerce Control List (CCL) under the 9x515 series.',
    keyResponsibilities: [
      'Administer Export Administration Regulations (EAR)',
      'Commerce Control List (CCL) ECCN classifications',
      'Export license processing for dual-use space items',
      'Entity List and denied persons list enforcement',
      'Deemed export rules (technology transfer to foreign nationals)',
      'End-use and end-user verification',
    ],
    spaceRelevance: 'Commercial satellite components, ground equipment, and many space technologies fall under EAR. Companies must properly classify items by ECCN and obtain licenses for controlled destinations. The 9x515 series is specifically designed for space-related items transferred from ITAR.',
    website: 'https://www.bis.gov',
    contactInfo: 'Exporter Counseling: (202) 482-4811',
    recentDevelopments: [
      'Expanded Entity List restrictions affecting space technology transfers to certain countries',
      'Updated deemed export rules for foreign national access to space technology',
      'New controls on advanced satellite components and AI-enabled remote sensing',
      'Increased enforcement actions for EAR violations in space sector',
    ],
  },
  {
    id: 'copuos',
    name: 'United Nations Committee on the Peaceful Uses of Outer Space',
    abbreviation: 'COPUOS',
    category: 'international',
    jurisdiction: 'Global (UN General Assembly)',
    primaryFunction: 'International space governance and treaty development',
    description: 'COPUOS is the main international forum for developing space governance norms and treaties. Established in 1959, it has two subcommittees: the Scientific and Technical Subcommittee and the Legal Subcommittee. COPUOS developed all five UN space treaties and continues to address emerging issues in space sustainability and governance.',
    keyResponsibilities: [
      'Development of international space law treaties and guidelines',
      'Long-term sustainability of outer space activities (LTS guidelines)',
      'Space debris mitigation guidelines',
      'Registration of space objects (Registration Convention)',
      'Space resource utilization governance discussions',
      'Coordination on space weather, NEO threats, and nuclear power in space',
    ],
    spaceRelevance: 'While COPUOS does not directly regulate commercial operators, its guidelines and norms shape national legislation worldwide. Companies must track COPUOS developments as they signal future regulatory directions on debris, resources, and sustainability.',
    website: 'https://www.unoosa.org/oosa/en/ourwork/copuos/index.html',
    contactInfo: 'UNOOSA: +43 1 26060 4950 (Vienna)',
    recentDevelopments: [
      'Ongoing implementation review of 21 Long-Term Sustainability Guidelines',
      'Active working group on space resource utilization governance',
      'Discussions on a new framework for space traffic management',
      'Enhanced focus on mega-constellation sustainability and dark sky impact',
    ],
  },
];

const KEY_REGULATIONS: KeyRegulation[] = [
  {
    id: 'outer-space-treaty',
    name: 'Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies',
    shortName: 'Outer Space Treaty (1967)',
    category: 'international_treaty',
    year: 1967,
    authority: 'United Nations',
    description: 'The foundational treaty of international space law, often called the "constitution of space." It establishes that outer space is free for exploration and use by all states, cannot be subject to national appropriation, and shall be used exclusively for peaceful purposes. It makes states internationally responsible for national space activities, including those of private entities.',
    keyProvisions: [
      'Article I: Space exploration and use shall be carried out for the benefit of all countries',
      'Article II: Outer space is not subject to national appropriation by sovereignty, use, or occupation',
      'Article III: Space activities shall be in accordance with international law and the UN Charter',
      'Article IV: Prohibition of nuclear weapons and WMDs in outer space; military bases banned on celestial bodies',
      'Article VI: States bear international responsibility for national space activities including private sector',
      'Article VII: Launching states are liable for damage caused by their space objects',
      'Article VIII: State of registry retains jurisdiction and control over space objects',
      'Article IX: Due regard principle; consultation for potentially harmful activities',
    ],
    applicability: 'Applies to all state parties (114 ratifications as of 2025). Indirectly binds commercial operators through Article VI state responsibility.',
    penalties: 'State-level liability under international law. No direct enforcement mechanism for private entities, but national legislation implements treaty obligations.',
    recentAmendments: [
      'No formal amendments since adoption',
      'Ongoing debates about Article II interpretation in context of space resource utilization',
      'Artemis Accords (2020) attempt to operationalize key treaty principles for lunar activities',
    ],
    furtherReading: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html',
  },
  {
    id: 'registration-convention',
    name: 'Convention on Registration of Objects Launched into Outer Space',
    shortName: 'Registration Convention (1975)',
    category: 'international_treaty',
    year: 1975,
    authority: 'United Nations',
    description: 'Requires states to maintain a national registry of space objects and provide launch information to the UN Secretary-General for inclusion in the UN Register. Essential for establishing jurisdiction, identifying liable parties, and tracking the growing population of objects in orbit.',
    keyProvisions: [
      'Article II: Launching state shall register space objects in a national registry',
      'Article III: UN Secretary-General maintains a central Register of space objects',
      'Article IV: Registration data includes launching state, designator, date/territory, basic orbital parameters, and general function',
      'Article VI: Mutual assistance in identification of space objects causing damage',
    ],
    applicability: 'All state parties (72 ratifications). In practice, most satellite operators register through their national space agency or designated authority.',
    penalties: 'No direct penalties, but unregistered objects complicate liability claims and may face regulatory issues nationally.',
    recentAmendments: [
      'UN General Assembly resolutions have expanded recommended registration practices',
      'Push for improved timeliness of registration (pre-launch notification)',
      'Discussions on registration of on-orbit servicing, debris removal, and constellation changes',
    ],
    furtherReading: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/registration-convention.html',
  },
  {
    id: 'liability-convention',
    name: 'Convention on International Liability for Damage Caused by Space Objects',
    shortName: 'Liability Convention (1972)',
    category: 'international_treaty',
    year: 1972,
    authority: 'United Nations',
    description: 'Establishes international rules for liability when space objects cause damage. Provides for absolute liability for damage on Earth\'s surface and fault-based liability for damage in outer space. The only time it was formally invoked was Canada\'s claim against the USSR for the Cosmos 954 incident (1978).',
    keyProvisions: [
      'Article II: Absolute liability for damage caused on Earth surface or to aircraft in flight',
      'Article III: Fault-based liability for damage to another space object in outer space',
      'Article IV: Joint and several liability for joint launches',
      'Article V: Exoneration if claimant state caused the damage through gross negligence',
      'Articles XIV-XX: Claims Commission procedure if diplomatic negotiations fail',
    ],
    applicability: 'All state parties (98 ratifications). Claims are state-to-state; private entities must work through their government.',
    penalties: 'Full compensation for damage under international law standards. No punitive damages. Limited to state-to-state claims framework.',
    recentAmendments: [
      'No formal amendments since adoption',
      'Growing discussion about updating for mega-constellation era and active debris removal',
      'Questions about liability for autonomous collision avoidance decisions',
    ],
    furtherReading: 'https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html',
  },
  {
    id: 'itar',
    name: 'International Traffic in Arms Regulations',
    shortName: 'ITAR',
    category: 'us_export_control',
    year: 1976,
    authority: 'US Department of State, Directorate of Defense Trade Controls (DDTC)',
    cfrReference: '22 CFR Parts 120-130',
    description: 'Controls the export and temporary import of defense articles and services on the United States Munitions List (USML). Launch vehicles, certain spacecraft, and defense-related space technologies remain on the USML. Any export requires DDTC authorization, with no license exceptions available.',
    keyProvisions: [
      'USML Category IV: Launch vehicles, guided missiles, ballistic missiles, rockets, torpedoes, bombs, and mines',
      'USML Category XV: Spacecraft and related articles (defense and intelligence satellites)',
      'Registration requirement for all manufacturers and exporters of defense articles',
      'Technical Assistance Agreements (TAA) for defense services',
      'DSP-5 license for permanent exports, DSP-73 for temporary exports',
      'Strict "see-through" rule: ITAR-controlled items embedded in larger systems remain controlled',
    ],
    applicability: 'All US persons (citizens, permanent residents, US-incorporated entities). Also applies to foreign persons in the US accessing ITAR data. Violations carry criminal and civil penalties.',
    penalties: 'Criminal: Up to $1M fine and 20 years imprisonment per violation. Civil: Up to $1.29M per violation. Debarment from export privileges. Consent agreements with mandatory compliance programs.',
    recentAmendments: [
      'ECR (Export Control Reform) transferred commercial satellites to EAR (2014)',
      'Defense and intelligence spacecraft remain on USML Category XV',
      'Updated DDTC electronic filing system (DECCS)',
      'New voluntary self-disclosure guidelines',
    ],
    furtherReading: 'https://www.pmddtc.state.gov/ddtc_public/ddtc_public?id=ddtc_kb_article_page&sys_id=24d528fddbfc930044f9ff621f961987',
  },
  {
    id: 'ear',
    name: 'Export Administration Regulations',
    shortName: 'EAR',
    category: 'us_export_control',
    year: 1979,
    authority: 'US Department of Commerce, Bureau of Industry and Security (BIS)',
    cfrReference: '15 CFR Parts 730-774',
    description: 'Controls the export of dual-use items on the Commerce Control List (CCL). Since the Export Control Reform of 2014, most commercial satellite systems and components fall under the EAR 9x515 series. Unlike ITAR, EAR provides license exceptions for certain transactions.',
    keyProvisions: [
      'ECCN 9A515: Spacecraft and related items (commercial satellites transferred from USML)',
      'ECCN 9B515: Test, inspection, and production equipment for spacecraft',
      'ECCN 9D515: Software for spacecraft development and production',
      'ECCN 9E515: Technology for spacecraft',
      'License exceptions: STA (Strategic Trade Authorization), TMP (Temporary exports), GOV (Government)',
      'EAR99: Items subject to EAR but not on CCL (minimal controls)',
    ],
    applicability: 'All US-origin items, items in the US, and certain foreign-made items incorporating US content above de minimis thresholds. Applies to all persons subject to US jurisdiction.',
    penalties: 'Criminal: Up to $1M fine and 20 years imprisonment. Civil: Up to $364,992 per violation or twice the transaction value. Denial of export privileges. Entity List placement.',
    recentAmendments: [
      'Expanded Entity List restrictions on space technology to certain countries',
      'New controls on items enabling precision geolocation and AI-enabled EO',
      'Updated de minimis calculation rules for foreign-produced items',
      'Enhanced military end-use and end-user controls',
    ],
    furtherReading: 'https://www.bis.gov/regulations/export-administration-regulations-ear',
  },
  {
    id: 'fcc-part-25',
    name: 'FCC Part 25 - Satellite Communications Rules',
    shortName: 'FCC Part 25',
    category: 'us_licensing_rule',
    year: 1962,
    authority: 'Federal Communications Commission',
    cfrReference: '47 CFR Part 25',
    description: 'The primary FCC rules governing satellite communications. Part 25 establishes licensing requirements for space stations (satellites), Earth stations, and related facilities. It covers technical standards, application procedures, orbital debris mitigation, and spectrum sharing for both GSO and NGSO systems.',
    keyProvisions: [
      'Section 25.114: Space station application requirements and processing',
      'Section 25.117: Modification and assignment of satellite licenses',
      'Section 25.121: License term (typically 15 years for GSO, variable for NGSO)',
      'Section 25.156: Processing rounds and first-come-first-served procedures',
      'Section 25.160: Application fees and regulatory fees',
      'Section 25.271: Orbital debris mitigation requirements (updated 5-year deorbit rule)',
      'Section 25.289: Surety bond requirement for NGSO systems ($100K-$2M per satellite)',
    ],
    applicability: 'All entities seeking to operate or communicate with satellites from US territory, or non-US systems seeking US market access. Covers all frequency bands allocated for satellite services.',
    penalties: 'License revocation, fines (forfeiture up to $2.46M per violation per day for non-broadcasters), and cease-and-desist orders. Unauthorized transmissions can result in equipment seizure.',
    recentAmendments: [
      'Adopted 5-year post-mission disposal rule (2022)',
      'Mandatory orbital debris mitigation disclosure (2020)',
      'Streamlined small satellite licensing (Part 25 and new Part 25A)',
      'Updated NGSO spectrum sharing framework for mega-constellations',
      'New surety bond/insurance requirements for orbital debris compliance',
    ],
    furtherReading: 'https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25',
  },
  {
    id: 'faa-part-450',
    name: 'FAA Part 450 - Commercial Space Transportation Licensing',
    shortName: 'FAA 14 CFR Part 450',
    category: 'us_licensing_rule',
    year: 2021,
    authority: 'Federal Aviation Administration, Office of Commercial Space Transportation',
    cfrReference: '14 CFR Part 450',
    description: 'The modernized FAA framework for commercial space launch and reentry licensing. Part 450 replaced the legacy Part 431 (reusable launch vehicles), Part 435 (expendable launch vehicles), and Part 437 (experimental permits) with a single performance-based, technology-neutral regulation.',
    keyProvisions: [
      'Section 450.41-450.49: Vehicle operator license application requirements',
      'Section 450.101-450.109: Flight safety analysis including debris risk assessment',
      'Section 450.131-450.139: Safety requirements for crew and space flight participants',
      'Section 450.161-450.169: Financial responsibility (liability insurance) requirements',
      'Section 450.171-450.177: Mishap reporting and investigation requirements',
      'Performance-based approach: operators can use any methodology meeting safety criteria',
      'Aggregate risk criteria: expected casualty per mission limits for public safety',
    ],
    applicability: 'All US commercial launch and reentry operators, launch site operators, and operations involving US citizens abroad. Applies to orbital, suborbital, and experimental flights.',
    penalties: 'Civil penalties up to $283,750 per violation per day. License suspension or revocation. Criminal penalties for knowingly and willfully violating license terms. Cease-and-desist authority.',
    recentAmendments: [
      'Full Part 450 effective March 10, 2021 (consolidating legacy parts)',
      'Updated maximum probable loss calculations for insurance requirements',
      'New informed consent requirements for human space flight participants',
      'Streamlined environmental review for programmatic launches at established sites',
    ],
    furtherReading: 'https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-450',
  },
];

const COMPLIANCE_CHECKLISTS: ComplianceChecklist[] = [
  {
    id: 'launch_satellite',
    activity: 'Launching a Satellite',
    description: 'Complete regulatory pathway for placing a commercial satellite into orbit from US territory or by a US operator.',
    complexity: 'very_high',
    totalEstimatedTimeline: '12-24 months',
    steps: [
      { step: 1, agency: 'FCC', requirement: 'Space Station License Application (Part 25)', description: 'File FCC Form 312 with technical specifications including orbital parameters, frequency bands, power levels, antenna characteristics, and orbital debris mitigation plan.', estimatedTimeline: '6-12 months', estimatedCost: '$37,675-$505,275 (varies by complexity)', notes: 'Small satellite streamlined process available for qualifying missions' },
      { step: 2, agency: 'FAA/AST', requirement: 'Launch Vehicle Operator License (Part 450)', description: 'Obtain launch license or verify your launch provider holds a valid license covering your mission profile. Submit mission-specific data for safety analysis.', estimatedTimeline: '6-18 months', estimatedCost: '$10,000-$50,000+ (application and review)', notes: 'If using an existing licensed provider (SpaceX, Rocket Lab, etc.), they hold the launch license' },
      { step: 3, agency: 'ITU', requirement: 'International Frequency Coordination', description: 'Coordinate through the FCC (US administration) to the ITU for advance publication, coordination (Article 9), and notification (Article 11) of satellite network frequencies.', estimatedTimeline: '2-7 years (parallel with other steps)', estimatedCost: 'Varies by filing type', notes: 'Begin ITU coordination early as it is the longest lead-time item' },
      { step: 4, agency: 'NOAA', requirement: 'Remote Sensing License (if applicable)', description: 'If satellite carries any Earth imaging capability (optical, SAR, multispectral, etc.), obtain a NOAA remote sensing license under 15 CFR Part 960.', estimatedTimeline: '3-6 months', estimatedCost: 'No application fee; compliance costs vary', notes: 'Required even for secondary or incidental imaging capability' },
      { step: 5, agency: 'BIS/DDTC', requirement: 'Export Control Classification', description: 'Determine whether satellite and components are controlled under EAR (ECCN 9x515) or ITAR (USML Cat IV/XV). Obtain necessary export licenses for any foreign components, ground station equipment, or launch from foreign territory.', estimatedTimeline: '1-6 months', estimatedCost: '$0 for classification; license processing varies' },
      { step: 6, agency: 'FCC', requirement: 'Earth Station Licenses', description: 'License ground station facilities for commanding, tracking, and receiving data from the satellite. May use blanket licensing for multiple terminals.', estimatedTimeline: '3-6 months', estimatedCost: '$3,545-$37,675' },
      { step: 7, agency: 'Insurance', requirement: 'Launch and In-Orbit Insurance', description: 'Obtain third-party liability insurance as required by FAA (minimum varies by mission) and typically first-party coverage for the satellite asset.', estimatedTimeline: '2-4 months', estimatedCost: '2-15% of satellite value for first-party; varies for TPL' },
      { step: 8, agency: 'UN/UNOOSA', requirement: 'Space Object Registration', description: 'Register the satellite through the US State Department to the UN Register of Space Objects per the Registration Convention.', estimatedTimeline: '1-3 months post-launch', estimatedCost: 'No fee' },
    ],
    tips: [
      'Start ITU coordination and FCC licensing in parallel -- these have the longest timelines',
      'Engage an experienced space regulatory attorney early in the process',
      'Use the FCC small satellite streamlined process if your satellite qualifies (under 180kg, under 600km altitude)',
      'Maintain a clear ITAR/EAR Technology Control Plan from day one of development',
      'Consider regulatory requirements during satellite design phase, not after',
    ],
    commonPitfalls: [
      'Underestimating ITU coordination timeline -- can take years for complex filings',
      'Failing to classify components for export control before engaging foreign suppliers',
      'Not including orbital debris mitigation costs in satellite budget',
      'Missing FCC surety bond or performance bond requirements for NGSO systems',
      'Assuming launch provider license covers all mission-specific requirements',
    ],
  },
  {
    id: 'ground_station',
    activity: 'Operating a Ground Station',
    description: 'Regulatory requirements for establishing and operating a satellite ground station facility in the United States.',
    complexity: 'medium',
    totalEstimatedTimeline: '3-9 months',
    steps: [
      { step: 1, agency: 'FCC', requirement: 'Earth Station License Application', description: 'File FCC Form 312 for fixed or mobile Earth station authorization. Specify antenna size, frequencies, emission designators, and satellite points of communication.', estimatedTimeline: '3-6 months', estimatedCost: '$3,545-$37,675', notes: 'Blanket licensing available for networks of similar terminals' },
      { step: 2, agency: 'FCC', requirement: 'Frequency Coordination', description: 'Coordinate proposed frequencies with existing terrestrial microwave users. Required for C-band and Ku-band Earth stations to avoid interference.', estimatedTimeline: '1-3 months', estimatedCost: '$1,000-$10,000 (coordination study)', notes: 'Required before FCC filing; hire a frequency coordination company' },
      { step: 3, agency: 'Local', requirement: 'Land Use Permits and Zoning', description: 'Obtain local building permits, zoning approval, and environmental clearances for antenna installation. May require FAA Form 7460-1 if near an airport.', estimatedTimeline: '1-6 months', estimatedCost: 'Varies by jurisdiction' },
      { step: 4, agency: 'FAA', requirement: 'Obstruction Evaluation (if applicable)', description: 'If the antenna exceeds 200 feet or is near an airport, file FAA Form 7460-1 for aeronautical study and obstruction marking/lighting determination.', estimatedTimeline: '1-3 months', estimatedCost: 'No federal fee' },
      { step: 5, agency: 'FCC', requirement: 'RF Safety Compliance', description: 'Ensure compliance with FCC RF exposure limits (OET Bulletin 65). May require an environmental assessment for high-power transmit stations.', estimatedTimeline: 'Concurrent with license', estimatedCost: '$1,000-$5,000 for RF study' },
    ],
    tips: [
      'Consider receive-only Earth stations which require only registration, not full licensing',
      'Blanket earth station licenses are more efficient for deploying multiple terminals',
      'Check for local RF emissions ordinances which may be stricter than FCC requirements',
      'Plan antenna placement to minimize interference from and to adjacent systems',
    ],
    commonPitfalls: [
      'Forgetting frequency coordination before filing with FCC -- delays processing',
      'Not checking local zoning restrictions on antenna installations',
      'Underestimating EMI/RFI issues at the selected site',
      'Neglecting ongoing annual regulatory fees to FCC',
    ],
  },
  {
    id: 'export_hardware',
    activity: 'Exporting Space Hardware',
    description: 'Process for legally exporting US-origin space technology, satellite components, or related technical data to foreign entities.',
    complexity: 'high',
    totalEstimatedTimeline: '1-12 months',
    steps: [
      { step: 1, agency: 'Self', requirement: 'Commodity Jurisdiction / Classification', description: 'Determine if your item is controlled under ITAR (USML) or EAR (CCL). File a Commodity Jurisdiction request with DDTC if classification is unclear, or self-classify under EAR.', estimatedTimeline: '2-8 weeks (CJ determination)', estimatedCost: 'No filing fee; legal costs for CJ analysis' },
      { step: 2, agency: 'DDTC', requirement: 'ITAR Registration (if USML)', description: 'Register with the Directorate of Defense Trade Controls as a manufacturer or exporter of defense articles. Required before applying for any ITAR export license.', estimatedTimeline: '4-6 weeks', estimatedCost: '$2,250/year registration fee' },
      { step: 3, agency: 'DDTC or BIS', requirement: 'Export License Application', description: 'For ITAR: Submit DSP-5 (permanent export) or DSP-73 (temporary export) via DECCS. For EAR: Submit BIS Form 748P via SNAP-R. Include end-user statement and transaction details.', estimatedTimeline: 'ITAR: 2-4 months. EAR: 1-3 months', estimatedCost: 'No application fees; legal preparation costs vary', notes: 'Some EAR items qualify for License Exceptions (STA, TMP, etc.)' },
      { step: 4, agency: 'DDTC', requirement: 'Technical Assistance Agreement (if services)', description: 'For providing defense services, technical data, or training to foreign persons, execute a TAA approved by DDTC. Required for most collaborative development programs.', estimatedTimeline: '3-6 months', estimatedCost: 'Legal costs for agreement drafting' },
      { step: 5, agency: 'Self', requirement: 'Technology Control Plan', description: 'Implement and maintain a Technology Control Plan (TCP) governing access to controlled items, IT security, visitor protocols, and deemed export controls for foreign national employees.', estimatedTimeline: 'Ongoing', estimatedCost: 'Internal compliance program costs' },
      { step: 6, agency: 'CBP', requirement: 'Customs and Shipping Documentation', description: 'File Electronic Export Information (EEI) via ACE/AESDirect for shipments over $2,500 or requiring an export license. Obtain Shipper\'s Export Declaration.', estimatedTimeline: 'At time of export', estimatedCost: 'Minimal filing costs' },
    ],
    tips: [
      'Classify items early in the design phase to identify export constraints before committing to foreign partners',
      'Consider "design-to-EAR" strategies to avoid ITAR restrictions where possible',
      'Implement robust deemed export controls for any foreign national employees',
      'Use license exceptions (EAR) or exemptions (ITAR Section 125/126) where applicable to speed transactions',
      'Maintain detailed records -- both ITAR and EAR require 5+ year record retention',
    ],
    commonPitfalls: [
      'Assuming commercial satellites are EAR without verifying -- defense-related payloads may be ITAR',
      'Failing to register with DDTC before applying for an ITAR license',
      'Sharing technical data with foreign nationals without proper authorization (deemed export violation)',
      'Not screening end-users against denied parties lists before each transaction',
      'Inadequate compliance training for engineering staff working with foreign partners',
    ],
  },
  {
    id: 'space_tourism',
    activity: 'Space Tourism Operations',
    description: 'Regulatory requirements for conducting commercial human spaceflight operations carrying paying passengers.',
    complexity: 'very_high',
    totalEstimatedTimeline: '18-36 months',
    steps: [
      { step: 1, agency: 'FAA/AST', requirement: 'Launch/Reentry License (Part 450)', description: 'Obtain an FAA launch or launch-and-reentry operator license. Must demonstrate safety analysis meeting aggregate risk criteria including EC (expected casualty) requirements for public and crew/participants.', estimatedTimeline: '12-24 months', estimatedCost: '$50,000-$500,000+', notes: 'Performance-based approach under Part 450 allows various vehicle designs' },
      { step: 2, agency: 'FAA/AST', requirement: 'Human Space Flight Requirements', description: 'Comply with crew qualification and space flight participant (SFP) safety requirements under Part 450 Subpart D. Provide safety briefings, emergency training, and medical screening protocols.', estimatedTimeline: 'Concurrent with license', estimatedCost: 'Included in operations development' },
      { step: 3, agency: 'FAA/AST', requirement: 'Informed Consent', description: 'Each space flight participant must provide written informed consent acknowledging the risks of space flight. Must describe the safety record of the vehicle and known hazards.', estimatedTimeline: 'Pre-flight per mission', estimatedCost: 'Legal document preparation', notes: 'FAA moratorium on SFP safety regulations extended through 2025' },
      { step: 4, agency: 'FAA/AST', requirement: 'Financial Responsibility / Insurance', description: 'Obtain third-party liability insurance at Maximum Probable Loss (MPL) amount determined by FAA. Typically $100M-$500M depending on vehicle and trajectory.', estimatedTimeline: '2-6 months', estimatedCost: 'Significant premium; varies by risk profile' },
      { step: 5, agency: 'FCC', requirement: 'Communications Licenses', description: 'Obtain FCC authorization for vehicle-to-ground communications, telemetry, and any passenger communications services during flight.', estimatedTimeline: '3-6 months', estimatedCost: 'Standard FCC fees' },
      { step: 6, agency: 'NEPA', requirement: 'Environmental Review', description: 'Complete environmental assessment or environmental impact statement under the National Environmental Policy Act for launch operations.', estimatedTimeline: '6-24 months', estimatedCost: '$100,000-$2M+', notes: 'May use programmatic EIS if operating from established launch site' },
    ],
    tips: [
      'Engage FAA/AST in pre-application consultations well before formal filing',
      'The learning period (regulatory moratorium on passenger safety rules) is still in effect -- use this flexibility wisely',
      'Build a robust safety management system from the start; FAA expects SMS even if not yet formally required',
      'Consider operating from an already-licensed launch site to simplify environmental review',
    ],
    commonPitfalls: [
      'Underestimating the time and cost of environmental review for new launch sites',
      'Insufficient insurance coverage -- MPL determinations can be higher than expected',
      'Not planning for the eventual end of the regulatory learning period and future crew safety requirements',
      'Inadequate informed consent documentation that does not meet evolving FAA guidance',
    ],
  },
  {
    id: 'remote_sensing',
    activity: 'Operating a Remote Sensing Satellite',
    description: 'Additional regulatory requirements specific to satellites carrying Earth observation or imaging payloads.',
    complexity: 'high',
    totalEstimatedTimeline: '6-18 months (in addition to general satellite licensing)',
    steps: [
      { step: 1, agency: 'NOAA', requirement: 'Remote Sensing License Application (Part 960)', description: 'Submit application to NOAA Office of Space Commerce describing the system, data products, distribution plans, and any shutter control provisions. Tiered authorization based on capability.', estimatedTimeline: '3-6 months', estimatedCost: 'No application fee' },
      { step: 2, agency: 'NOAA', requirement: 'Tier Classification', description: 'NOAA classifies your system into Tier 1 (unenhanced data freely available), Tier 2 (standard controls), or Tier 3 (enhanced security requirements based on capability).', estimatedTimeline: 'Part of application review', estimatedCost: 'No additional fee', notes: 'Higher resolution systems typically receive more restrictive tier classification' },
      { step: 3, agency: 'NOAA', requirement: 'Data Distribution Plan', description: 'Specify how imagery data will be distributed, to whom, and any restrictions. May include shutter control provisions allowing the government to restrict imaging during national security events.', estimatedTimeline: 'Part of application', estimatedCost: 'Compliance infrastructure costs' },
      { step: 4, agency: 'BIS/DDTC', requirement: 'Export Control for Imagery', description: 'Classify remote sensing data products for export control. High-resolution EO data may require export licenses depending on resolution, spectral bands, and end user.', estimatedTimeline: '1-3 months', estimatedCost: 'Varies' },
      { step: 5, agency: 'NOAA', requirement: 'Annual Reporting and Compliance', description: 'Maintain ongoing compliance including annual operations reports, notification of any system changes, and cooperation with NOAA compliance inspections.', estimatedTimeline: 'Ongoing annually', estimatedCost: 'Internal compliance costs' },
    ],
    tips: [
      'The 2020 Part 960 modernization significantly simplified the licensing process with tiered approach',
      'Engage NOAA pre-application to understand likely tier classification for your system',
      'Consider data distribution restrictions early in business model development',
      'SAR and hyperspectral systems may face additional scrutiny and higher tier classification',
    ],
    commonPitfalls: [
      'Designing a satellite with remote sensing capability without obtaining NOAA license (even if imaging is not the primary mission)',
      'Not planning for potential shutter control or imaging restriction requirements',
      'Underestimating export control implications of high-resolution imagery distribution',
      'Failing to report system changes or operational anomalies to NOAA',
    ],
  },
  {
    id: 'spectrum_use',
    activity: 'Using Radio Spectrum for Space Operations',
    description: 'Comprehensive guide to obtaining radio frequency spectrum authorization for satellite communications and space operations.',
    complexity: 'high',
    totalEstimatedTimeline: '6-36 months depending on band and system complexity',
    steps: [
      { step: 1, agency: 'ITU', requirement: 'Advance Publication Information (API)', description: 'File advance publication with ITU through FCC (US administration) to notify other administrations of planned satellite network at least 2 years before use.', estimatedTimeline: '2+ years before operation', estimatedCost: 'ITU cost recovery charges apply' },
      { step: 2, agency: 'ITU', requirement: 'Coordination (Article 9)', description: 'Coordinate with potentially affected satellite networks and terrestrial services. Negotiate technical parameters to ensure compatible operation.', estimatedTimeline: '7 years max from API', estimatedCost: 'Coordination study costs vary' },
      { step: 3, agency: 'FCC', requirement: 'Space Station Authorization', description: 'File for FCC space station license specifying all frequency bands, emission characteristics, and service areas. Must demonstrate ITU coordination status.', estimatedTimeline: '6-12 months', estimatedCost: 'FCC application fees' },
      { step: 4, agency: 'FCC', requirement: 'Spectrum Sharing Analysis', description: 'Demonstrate compatibility with other authorized systems in the same or adjacent bands. Particularly important for NGSO systems sharing with GSO networks.', estimatedTimeline: 'Part of application review', estimatedCost: 'Engineering study costs' },
      { step: 5, agency: 'ITU', requirement: 'Notification and Recording (Article 11)', description: 'After coordination, notify the ITU for recording in the Master International Frequency Register. This provides international recognition and protection.', estimatedTimeline: '1-2 years', estimatedCost: 'ITU cost recovery charges' },
      { step: 6, agency: 'ITU', requirement: 'Due Diligence / Milestone Compliance', description: 'Meet ITU milestone requirements demonstrating genuine progress toward satellite deployment. Failure to meet milestones can result in loss of filing priority.', estimatedTimeline: 'Per ITU milestone schedule', estimatedCost: 'Deployment costs' },
    ],
    tips: [
      'Begin ITU filings as early as possible -- spectrum rights are based on filing priority',
      'Hire experienced spectrum engineers and regulatory counsel for ITU coordination',
      'Consider multiple frequency bands for operational flexibility and redundancy',
      'Monitor WRC outcomes as they can change spectrum allocation landscape significantly',
    ],
    commonPitfalls: [
      'Missing ITU milestone deadlines resulting in cancellation of filing rights',
      'Underestimating the complexity and duration of NGSO-GSO coordination',
      'Not accounting for coordination with non-US satellite systems in the same bands',
      'Failing to coordinate with terrestrial services that share satellite frequency bands',
    ],
  },
];

function RegulatoryBodiesRefTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return KEY_REGULATORY_BODIES.filter((body) => {
      if (categoryFilter && body.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          body.name.toLowerCase().includes(q) ||
          body.abbreviation.toLowerCase().includes(q) ||
          body.primaryFunction.toLowerCase().includes(q) ||
          body.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchQuery, categoryFilter]);

  return (
    <div>
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-400 mb-2">Key Space Regulatory Bodies</h4>
        <p className="text-sm text-slate-400">Essential regulatory authorities governing commercial space activities. Understanding which agencies regulate your operations is the first step toward compliance.</p>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-400 text-sm mb-1">Search</label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search regulatory bodies..."
              aria-label="Search regulatory bodies"
              className="w-full bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
            >
              <option value="">All Categories</option>
              <option value="us_licensing">US Licensing</option>
              <option value="international">International</option>
              <option value="export_control">Export Control</option>
            </select>
          </div>
          {(searchQuery || categoryFilter) && (
            <button onClick={() => { setSearchQuery(''); setCategoryFilter(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {(Object.entries(REGULATORY_BODY_REF_CATEGORY_CONFIG) as [RegulatoryBodyRefCategory, typeof REGULATORY_BODY_REF_CATEGORY_CONFIG[RegulatoryBodyRefCategory]][]).map(([cat, config]) => {
          const count = KEY_REGULATORY_BODIES.filter((b) => b.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
              className={`card-elevated p-4 text-center transition-all cursor-pointer ${categoryFilter === cat ? 'ring-2 ring-nebula-500/50' : ''}`}
            >
              <div className={`text-2xl font-bold font-display ${config.text}`}>{count}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">{config.label}</div>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filtered.map((body) => {
          const catConfig = REGULATORY_BODY_REF_CATEGORY_CONFIG[body.category];
          const isExpanded = expandedId === body.id;
          return (
            <div key={body.id} className="card p-5 hover:border-nebula-500/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-xl font-bold text-white">{body.abbreviation}</h4>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}>{catConfig.label}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{body.name}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3">
                <span>Jurisdiction: {body.jurisdiction}</span>
              </div>
              <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 mb-3">
                <p className="text-sm text-nebula-300 font-medium">{body.primaryFunction}</p>
              </div>
              <p className="text-slate-400 text-sm mb-3 leading-relaxed">{body.description}</p>
              <button
                onClick={() => setExpandedId(isExpanded ? null : body.id)}
                className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors"
              >
                {isExpanded ? 'Show Less' : 'View Details'}
              </button>
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Key Responsibilities</h5>
                    <ul className="space-y-1.5">
                      {body.keyResponsibilities.map((resp, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          {resp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Space Industry Relevance</h5>
                    <p className="text-xs text-slate-400">{body.spaceRelevance}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Recent Developments</h5>
                    <ul className="space-y-1.5">
                      {body.recentDevelopments.map((dev, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <span className="text-yellow-400 flex-shrink-0 mt-0.5">*</span>
                          {dev}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
                    <span>{body.contactInfo}</span>
                    <a href={body.website} target="_blank" rel="noopener noreferrer" className="text-nebula-300 hover:text-nebula-200">Visit Website &rarr;</a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20">
          <h3 className="text-xl font-semibold text-white mb-2">No regulatory bodies match your search</h3>
          <button onClick={() => { setSearchQuery(''); setCategoryFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button>
        </div>
      )}
    </div>
  );
}

function KeyRegulationsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return KEY_REGULATIONS.filter((reg) => {
      if (categoryFilter && reg.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          reg.name.toLowerCase().includes(q) ||
          reg.shortName.toLowerCase().includes(q) ||
          reg.description.toLowerCase().includes(q) ||
          reg.authority.toLowerCase().includes(q) ||
          (reg.cfrReference && reg.cfrReference.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [searchQuery, categoryFilter]);

  return (
    <div>
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-purple-400 mb-2">Key Space Regulations & Treaties</h4>
        <p className="text-sm text-slate-400">The core legal instruments governing commercial space activities, from foundational international treaties to specific US regulatory frameworks. Each entry includes key provisions, penalties, and recent amendments.</p>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-400 text-sm mb-1">Search</label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search regulations, treaties, CFR references..."
              aria-label="Search regulations"
              className="w-full bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
            >
              <option value="">All Categories</option>
              <option value="international_treaty">International Treaties</option>
              <option value="us_export_control">US Export Controls</option>
              <option value="us_licensing_rule">US Licensing Rules</option>
            </select>
          </div>
          {(searchQuery || categoryFilter) && (
            <button onClick={() => { setSearchQuery(''); setCategoryFilter(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(Object.entries(REGULATION_CATEGORY_CONFIG) as [RegulationCategory, typeof REGULATION_CATEGORY_CONFIG[RegulationCategory]][]).map(([cat, config]) => {
          const count = KEY_REGULATIONS.filter((r) => r.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
              className={`card-elevated p-4 text-center transition-all cursor-pointer ${categoryFilter === cat ? 'ring-2 ring-nebula-500/50' : ''}`}
            >
              <div className={`text-2xl font-bold font-display ${config.text}`}>{count}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">{config.label}</div>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filtered.map((reg) => {
          const catConfig = REGULATION_CATEGORY_CONFIG[reg.category];
          const isExpanded = expandedId === reg.id;
          return (
            <div key={reg.id} className="card p-5 hover:border-nebula-500/30 transition-all">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-lg mb-1">{reg.shortName}</h4>
                  <p className="text-slate-400 text-xs line-clamp-2">{reg.name}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}>{catConfig.label}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3">
                <span>Year: {reg.year}</span>
                <span>Authority: {reg.authority}</span>
                {reg.cfrReference && <span className="font-mono text-nebula-300">{reg.cfrReference}</span>}
              </div>
              <p className="text-slate-400 text-sm mb-3 leading-relaxed line-clamp-3">{reg.description}</p>
              <button
                onClick={() => setExpandedId(isExpanded ? null : reg.id)}
                className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors"
              >
                {isExpanded ? 'Show Less' : 'View Full Details'}
              </button>
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Key Provisions</h5>
                    <ul className="space-y-1.5">
                      {reg.keyProvisions.map((provision, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <svg className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          {provision}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Applicability</h5>
                      <p className="text-xs text-slate-400">{reg.applicability}</p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-red-400 mb-1 uppercase tracking-wider">Penalties</h5>
                      <p className="text-xs text-slate-400">{reg.penalties}</p>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Recent Amendments & Developments</h5>
                    <ul className="space-y-1.5">
                      {reg.recentAmendments.map((amendment, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <span className="text-yellow-400 flex-shrink-0 mt-0.5">*</span>
                          {amendment}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a href={reg.furtherReading} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-nebula-300 hover:text-nebula-200">View Full Text / Further Reading &rarr;</a>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20">
          <h3 className="text-xl font-semibold text-white mb-2">No regulations match your search</h3>
          <button onClick={() => { setSearchQuery(''); setCategoryFilter(''); }} className="text-nebula-300 hover:text-white text-sm transition-colors">Clear All Filters</button>
        </div>
      )}
    </div>
  );
}

function ComplianceChecklistsTab() {
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistActivityId>('launch_satellite');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const checklist = COMPLIANCE_CHECKLISTS.find((c) => c.id === selectedChecklist) || COMPLIANCE_CHECKLISTS[0];

  const handleToggleStep = useCallback((checklistId: string, step: number) => {
    const key = `${checklistId}-${step}`;
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const completionCount = checklist.steps.filter((s) => completedSteps.has(`${checklist.id}-${s.step}`)).length;
  const completionPct = Math.round((completionCount / checklist.steps.length) * 100);

  const filteredSteps = useMemo(() => {
    if (!searchQuery) return checklist.steps;
    const q = searchQuery.toLowerCase();
    return checklist.steps.filter(
      (s) =>
        s.requirement.toLowerCase().includes(q) ||
        s.agency.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [checklist.steps, searchQuery]);

  return (
    <div>
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-green-400 mb-2">Compliance Checklists</h4>
        <p className="text-sm text-slate-400">Step-by-step regulatory checklists for common space activities. Select an activity below to see all required licenses, approvals, and registrations with estimated timelines and costs. Track your progress with the interactive checklist.</p>
      </div>

      {/* Activity Selector */}
      <div className="relative mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {COMPLIANCE_CHECKLISTS.map((cl) => {
            const complexityConfig = CHECKLIST_COMPLEXITY_CONFIG[cl.complexity];
            return (
              <button
                key={cl.id}
                onClick={() => { setSelectedChecklist(cl.id); setCompletedSteps(new Set()); setSearchQuery(''); }}
                className={`flex flex-col items-start px-4 py-3 rounded-lg transition-all whitespace-nowrap min-w-[180px] ${
                  selectedChecklist === cl.id
                    ? 'bg-nebula-500/20 text-white border border-nebula-500/50'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-600/50'
                }`}
              >
                <span className="text-sm font-semibold">{cl.activity}</span>
                <span className={`text-xs mt-1 px-2 py-0.5 rounded ${complexityConfig.bg} ${complexityConfig.text}`}>{complexityConfig.label}</span>
              </button>
            );
          })}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none md:hidden" />
      </div>

      {/* Checklist Header */}
      <div className="card p-5 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{checklist.activity}</h3>
            <p className="text-sm text-slate-400">{checklist.description}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <div className="text-2xl font-bold text-white">{checklist.totalEstimatedTimeline}</div>
            <div className="text-xs text-slate-400">Estimated Total Timeline</div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Progress: {completionCount}/{checklist.steps.length} steps</span>
            <span className="text-sm font-bold text-nebula-300">{completionPct}%</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-nebula-500 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search within steps */}
      <div className="mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search within checklist steps..."
          aria-label="Search checklist steps"
          className="w-full md:w-96 bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-4 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:border-nebula-500"
        />
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-8">
        {filteredSteps.map((step) => {
          const isCompleted = completedSteps.has(`${checklist.id}-${step.step}`);
          return (
            <div
              key={step.step}
              className={`card p-4 transition-all ${isCompleted ? 'border-green-500/30 bg-green-500/5' : 'hover:border-nebula-500/30'}`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggleStep(checklist.id, step.step)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isCompleted
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-600/40 hover:border-nebula-500/50'
                  }`}
                  aria-label={`${isCompleted ? 'Uncheck' : 'Check'} step ${step.step}`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <span className="text-sm font-bold">{step.step}</span>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-nebula-300 bg-slate-700/60 px-2 py-0.5 rounded">{step.agency}</span>
                        <h4 className={`font-semibold text-sm ${isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>{step.requirement}</h4>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{step.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>Timeline: <span className="text-white font-medium">{step.estimatedTimeline}</span></span>
                    <span>Cost: <span className="text-white font-medium">{step.estimatedCost}</span></span>
                  </div>
                  {step.notes && (
                    <div className="mt-2 bg-yellow-500/5 border border-yellow-500/20 rounded px-3 py-1.5">
                      <p className="text-xs text-yellow-400">{step.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips and Pitfalls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-4">Tips for Success</h4>
          <ul className="space-y-2">
            {checklist.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <svg className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4">Common Pitfalls to Avoid</h4>
          <ul className="space-y-2">
            {checklist.commonPitfalls.map((pitfall, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-red-400 flex-shrink-0 mt-0.5 text-sm">!</span>
                {pitfall}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ############################################################################
// MAIN PAGE - Two-Level Tab System
// ############################################################################

type TopSection = 'compliance' | 'space-law' | 'filings' | 'protests' | 'quick-reference';

function getTopSectionFromTab(tab: string): TopSection {
  const complianceTabs = ['policy', 'wizard', 'cases', 'export', 'experts'];
  const spaceLawTabs = ['treaties', 'national', 'artemis', 'proceedings', 'bodies'];
  const filingsTabs = ['fcc', 'faa', 'itu', 'sec', 'federal-register'];
  const protestTabs = ['protests-overview', 'protests-timeline', 'protests-analysis'];
  const quickRefTabs = ['ref-bodies', 'ref-regulations', 'ref-checklists'];
  if (complianceTabs.includes(tab)) return 'compliance';
  if (spaceLawTabs.includes(tab)) return 'space-law';
  if (filingsTabs.includes(tab)) return 'filings';
  if (protestTabs.includes(tab)) return 'protests';
  if (quickRefTabs.includes(tab)) return 'quick-reference';
  return 'compliance';
}

function getDefaultSubTab(section: TopSection): string {
  if (section === 'compliance') return 'policy';
  if (section === 'space-law') return 'treaties';
  if (section === 'filings') return 'fcc';
  if (section === 'protests') return 'protests-overview';
  if (section === 'quick-reference') return 'ref-bodies';
  return 'policy';
}

function RegulatoryHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = searchParams.get('tab') || 'policy';
  const initialSection = getTopSectionFromTab(initialTab);

  const [activeSection, setActiveSection] = useState<TopSection>(initialSection);
  const [activeSubTab, setActiveSubTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const stats = getRegulatoryHubStats();

  const fetchData = useCallback(async () => {
    try {
      const sections = [
        'treaties',
        'national-laws',
        'artemis-principles',
        'artemis-signatories',
        'legal-proceedings',
        'regulatory-bodies',
        'fcc-filings',
        'faa-licenses',
        'itu-filings',
        'sec-filings',
        'federal-register-entries',
        'bid-protests',
      ];

      const results = await Promise.all(
        sections.map((section) =>
          fetch(`/api/content/compliance?section=${section}`)
            .then((res) => res.json())
            .catch(() => ({ data: [], meta: {} }))
        )
      );

      TREATIES = results[0]?.data || [];
      NATIONAL_LAWS = results[1]?.data || [];
      ARTEMIS_PRINCIPLES = results[2]?.data || [];
      ARTEMIS_SIGNATORIES = results[3]?.data || [];
      LEGAL_PROCEEDINGS = results[4]?.data || [];
      REGULATORY_BODIES = results[5]?.data || [];
      FCC_FILINGS = results[6]?.data || [];
      FAA_LICENSES = results[7]?.data || [];
      ITU_FILINGS = results[8]?.data || [];
      SEC_FILINGS = results[9]?.data || [];
      FEDERAL_REGISTER_ENTRIES = results[10]?.data || [];
      BID_PROTESTS = results[11]?.data || [];

      const firstMeta = results.find((r) => r?.meta?.lastRefreshed)?.meta;
      if (firstMeta?.lastRefreshed) {
        setRefreshedAt(firstMeta.lastRefreshed);
      }
    } catch (err) {
      clientLogger.error('Failed to fetch compliance data', { error: err instanceof Error ? err.message : String(err) });
      setError('Failed to load compliance data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data from DynamicContent API
  useEffect(() => {
    // Reset module-level data on mount to prevent stale data from previous navigations
    TREATIES = [];
    NATIONAL_LAWS = [];
    ARTEMIS_PRINCIPLES = [];
    ARTEMIS_SIGNATORIES = [];
    LEGAL_PROCEEDINGS = [];
    REGULATORY_BODIES = [];
    FCC_FILINGS = [];
    FAA_LICENSES = [];
    ITU_FILINGS = [];
    SEC_FILINGS = [];
    FEDERAL_REGISTER_ENTRIES = [];
    BID_PROTESTS = [];

    fetchData();

    // Clean up module-level data on unmount
    return () => {
      TREATIES = [];
      NATIONAL_LAWS = [];
      ARTEMIS_PRINCIPLES = [];
      ARTEMIS_SIGNATORIES = [];
      LEGAL_PROCEEDINGS = [];
      REGULATORY_BODIES = [];
      FCC_FILINGS = [];
      FAA_LICENSES = [];
      ITU_FILINGS = [];
      SEC_FILINGS = [];
      FEDERAL_REGISTER_ENTRIES = [];
      BID_PROTESTS = [];
    };
  }, [fetchData]);

  // Sync tab to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeSubTab !== 'policy') params.set('tab', activeSubTab);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [activeSubTab, router, pathname]);

  const handleSectionChange = useCallback((section: TopSection) => {
    setActiveSection(section);
    const defaultTab = getDefaultSubTab(section);
    setActiveSubTab(defaultTab);
  }, []);

  useSwipeTabs(
    ['compliance', 'space-law', 'filings', 'protests', 'quick-reference'],
    activeSection,
    (tab) => handleSectionChange(tab as TopSection)
  );

  const topSections: { id: TopSection; label: string; icon: string }[] = [
    { id: 'compliance', label: 'Compliance', icon: '\uD83D\uDCCB' },
    { id: 'space-law', label: 'Space Law', icon: '\u2696\uFE0F' },
    { id: 'filings', label: 'Regulatory Filings', icon: '\uD83D\uDCC4' },
    { id: 'protests', label: 'Bid Protests & Claims', icon: '\uD83C\uDFDB\uFE0F' },
    { id: 'quick-reference', label: 'Quick Reference', icon: '\uD83D\uDCD6' },
  ];

  const complianceSubTabs = [
    { id: 'policy', label: 'Policy Tracker', icon: '\uD83D\uDCF0' },
    { id: 'wizard', label: 'Compliance Wizard', icon: '\uD83E\uDDD9' },
    { id: 'cases', label: 'Case Law Archive', icon: '\u2696\uFE0F' },
    { id: 'export', label: 'Export Controls', icon: '\uD83D\uDCE6' },
    { id: 'experts', label: 'Expert Commentary', icon: '\uD83D\uDCA1' },
  ];

  const spaceLawSubTabs = [
    { id: 'treaties', label: 'Treaties' },
    { id: 'national', label: 'National Laws' },
    { id: 'artemis', label: 'Artemis Accords' },
    { id: 'proceedings', label: 'Legal Proceedings' },
    { id: 'bodies', label: 'Regulatory Bodies' },
  ];

  const protestsSubTabs = [
    { id: 'protests-overview', label: 'All Decisions' },
    { id: 'protests-timeline', label: 'Timeline' },
    { id: 'protests-analysis', label: 'Analysis & Trends' },
  ];

  const quickRefSubTabs = [
    { id: 'ref-bodies', label: 'Regulatory Bodies' },
    { id: 'ref-regulations', label: 'Key Regulations' },
    { id: 'ref-checklists', label: 'Compliance Checklists' },
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="h-4 bg-slate-800 rounded w-2/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>
          ))}
        </div>
        <div className="flex gap-2 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-32 bg-slate-800 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => { await fetchData(); }}>
      {error && (
        <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium mb-2">{error}</div>
          <button onClick={() => { setError(null); setLoading(true); window.location.reload(); }} className="text-xs text-red-300 hover:text-red-200 underline transition-colors min-h-[44px] px-4 inline-flex items-center">Try Again</button>
        </div>
      )}
      {/* Stats Overview */}
      <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" className="mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-white">{stats.totalPolicies}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Policy Changes</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">{stats.totalLicenseTypes}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">License Types</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-green-400">{stats.totalCases}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Case Law</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-blue-400">{stats.totalECCNs + stats.totalUSMLCategories}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Export Controls</div>
        </div>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-purple-400">{stats.totalExpertSources}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Expert Sources</div>
        </div>
      </div>

      <InlineDisclaimer />

      {/* Top-Level Section Navigation */}
      <div className="relative">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {topSections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleSectionChange(section.id)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-3 min-h-[44px] rounded-lg font-semibold text-sm transition-all whitespace-nowrap touch-target ${
                activeSection === section.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-600/50'
              }`}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none md:hidden" />
      </div>

      {/* Sub-Tab Navigation */}
      {activeSection === 'compliance' && (
        <div className="relative">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            {complianceSubTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg font-medium transition-all whitespace-nowrap touch-target ${
                  activeSubTab === tab.id
                    ? 'bg-slate-700/80 text-slate-100 border-slate-500/50 shadow-glow-sm'
                    : 'bg-transparent text-slate-400 border border-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none md:hidden" />
        </div>
      )}

      {activeSection === 'space-law' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {spaceLawSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-slate-700/80 text-slate-100 border border-slate-500/50 shadow-glow-sm'
                  : 'bg-transparent text-slate-400 border border-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'filings' && (
        <div className="relative">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {getFilingsTabs().map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeSubTab === tab.id
                    ? 'bg-nebula-500 text-white shadow-glow-sm'
                    : 'bg-white/5 text-star-300 hover:bg-white/10'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSubTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-star-300'}`}>{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none md:hidden" />
        </div>
      )}

      {activeSection === 'protests' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {protestsSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-slate-700/80 text-slate-100 border border-slate-500/50 shadow-glow-sm'
                  : 'bg-transparent text-slate-400 border border-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'quick-reference' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {quickRefSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-slate-700/80 text-slate-100 border border-slate-500/50 shadow-glow-sm'
                  : 'bg-transparent text-slate-400 border border-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      {activeSubTab === 'policy' && <PolicyTrackerTab />}
      {activeSubTab === 'wizard' && <ComplianceWizardTab />}
      {activeSubTab === 'cases' && <CaseLawArchiveTab />}
      {activeSubTab === 'export' && <ExportControlMonitorTab />}
      {activeSubTab === 'experts' && <ExpertCommentaryTab />}

      {/* Space Law Section (lazy-loaded) */}
      {activeSection === 'space-law' && (
        <SpaceLawSection
          activeSubTab={activeSubTab}
          treaties={TREATIES}
          nationalLaws={NATIONAL_LAWS}
          artemisPrinciples={ARTEMIS_PRINCIPLES}
          artemisSignatories={ARTEMIS_SIGNATORIES}
          legalProceedings={LEGAL_PROCEEDINGS}
          regulatoryBodies={REGULATORY_BODIES}
        />
      )}

      {/* Filings Section (lazy-loaded) */}
      {activeSection === 'filings' && (
        <FilingsSection
          activeSubTab={activeSubTab}
          fccFilings={FCC_FILINGS}
          faaLicenses={FAA_LICENSES}
          ituFilings={ITU_FILINGS}
          secFilings={SEC_FILINGS}
          federalRegisterEntries={FEDERAL_REGISTER_ENTRIES}
        />
      )}

      {/* Protests Section (lazy-loaded) */}
      {activeSection === 'protests' && (
        <ProtestsSection
          activeSubTab={activeSubTab}
          protests={BID_PROTESTS}
        />
      )}

      {/* Quick Reference Section */}
      {activeSubTab === 'ref-bodies' && <RegulatoryBodiesRefTab />}
      {activeSubTab === 'ref-regulations' && <KeyRegulationsTab />}
      {activeSubTab === 'ref-checklists' && <ComplianceChecklistsTab />}
    </PullToRefresh>
  );
}

export default function RegulatoryHubPage() {
  return (
    <>
    <FAQSchema items={[
      { question: 'What space regulations does SpaceNexus track?', answer: 'SpaceNexus tracks ITAR/EAR export controls, FCC spectrum licensing (Part 25), FAA launch licenses (Part 450), NOAA remote sensing permits, ITU frequency coordination, international treaties including the Outer Space Treaty (1967), Registration Convention, Liability Convention, and national space laws from over 20 countries.' },
      { question: 'Is SpaceNexus compliance information considered legal advice?', answer: 'No. SpaceNexus provides regulatory information for awareness and research purposes only. Always consult qualified legal counsel for compliance decisions specific to your organization.' },
      { question: 'What are ITAR and EAR in the space industry?', answer: 'ITAR (International Traffic in Arms Regulations) controls defense articles including launch vehicles and defense spacecraft under USML Categories IV and XV. EAR (Export Administration Regulations) covers dual-use commercial items including commercial satellites under ECCN 9x515. Both regulate what space technology can be exported and to whom, with criminal penalties up to $1M and 20 years imprisonment per violation.' },
      { question: 'What licenses do I need to launch a satellite?', answer: 'Launching a commercial satellite from the US typically requires: FCC space station license (Part 25), FAA launch license (Part 450) or use of a licensed launch provider, ITU frequency coordination, NOAA remote sensing license (if carrying imaging payload), export control classification (ITAR/EAR), and proper insurance. The full process takes 12-24 months.' },
      { question: 'Which regulatory bodies oversee commercial space activities?', answer: 'Key bodies include: FCC (spectrum and satellite licensing), FAA/AST (launch and reentry licensing), ITU (international frequency coordination), NOAA (remote sensing licenses), BIS (export controls under EAR), DDTC (export controls under ITAR), and COPUOS (international space governance at the UN level).' },
    ]} />
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Regulatory Hub"
          subtitle="Comprehensive regulatory tracking, compliance guidance, space law, bid protests, case law, filings, and expert analysis for the space industry"
          icon="⚖️"
          accentColor="amber"
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            &larr; Back to Dashboard
          </Link>
        </AnimatedPageHeader>

        <PremiumGate requiredTier="pro">
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <RegulatoryHubContent />
          </Suspense>
        </PremiumGate>

        <RelatedModules modules={[
          { name: 'Regulatory Calendar', description: 'Upcoming deadlines and filing dates', href: '/regulatory-calendar', icon: '\u{1F4C5}' },
          { name: 'Regulatory Risk', description: 'Risk assessment and scoring', href: '/regulatory-risk', icon: '\u{26A0}\u{FE0F}' },
          { name: 'Spectrum Management', description: 'Frequency allocations and auctions', href: '/spectrum', icon: '\u{1F4E1}' },
        ]} />
      </div>
    </div>
    </>
  );
}
