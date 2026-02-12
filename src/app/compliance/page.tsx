'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import InlineDisclaimer from '@/components/InlineDisclaimer';
import DataFreshness from '@/components/ui/DataFreshness';
import PremiumGate from '@/components/PremiumGate';
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
// SPACE LAW - Types, Status Configs, and Data
// ############################################################################

type SpaceLawTabId = 'treaties' | 'national' | 'artemis' | 'proceedings' | 'bodies';

type TreatyStatus = 'in_force' | 'open' | 'not_in_force';
type NationalLawStatus = 'enacted' | 'amended' | 'proposed' | 'under_review';
type ArtemisStatus = 'signatory' | 'implementing' | 'observer';
type ProceedingStatus = 'active' | 'resolved' | 'pending' | 'advisory';
type BodyType = 'un' | 'national' | 'regional' | 'industry';

interface Treaty {
  id: string;
  name: string;
  fullName: string;
  adoptedYear: number;
  entryIntoForceYear: number;
  status: TreatyStatus;
  ratifications: number;
  signatories: number;
  depositary: string;
  keyProvisions: string[];
  description: string;
  significance: string;
}

interface NationalLaw {
  id: string;
  country: string;
  countryCode: string;
  lawName: string;
  year: number;
  status: NationalLawStatus;
  agency: string;
  keyFeatures: string[];
  description: string;
  scope: string;
}

interface ArtemisSignatory {
  id: string;
  country: string;
  countryCode: string;
  dateSigned: string;
  region: string;
  spaceAgency: string;
  implementationStatus: ArtemisStatus;
  notes: string;
}

interface LegalProceeding {
  id: string;
  title: string;
  type: string;
  parties: string;
  status: ProceedingStatus;
  year: number;
  jurisdiction: string;
  description: string;
  significance: string;
  outcome: string;
}

interface RegulatoryBody {
  id: string;
  name: string;
  abbreviation: string;
  type: BodyType;
  headquarters: string;
  established: number;
  members: string;
  mandate: string;
  keyFunctions: string[];
  website: string;
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

let TREATIES: Treaty[] = [];
let NATIONAL_LAWS: NationalLaw[] = [];
let ARTEMIS_PRINCIPLES: { title: string; description: string }[] = [];
let ARTEMIS_SIGNATORIES: ArtemisSignatory[] = [];
let LEGAL_PROCEEDINGS: LegalProceeding[] = [];
let REGULATORY_BODIES: RegulatoryBody[] = [];

// ############################################################################
// REGULATORY FILINGS - Types, Status Configs, and Data
// ############################################################################

type FilingStatus = 'granted' | 'pending' | 'denied' | 'dismissed' | 'amended' | 'active' | 'expired' | 'proposed' | 'final' | 'comment';

interface FCCFiling { id: string; callSign?: string; fileNumber: string; applicant: string; filingType: string; band: string; orbitType: 'NGSO' | 'GSO' | 'HEO' | 'MEO'; status: FilingStatus; dateFiled: string; dateActedOn?: string; satelliteCount?: number; summary: string; docket?: string; }
interface FAALicense { id: string; licenseNumber: string; licensee: string; licenseType: 'Launch' | 'Reentry' | 'Launch Site' | 'Launch/Reentry'; vehicle: string; launchSite: string; status: FilingStatus; dateIssued: string; expirationDate: string; missionsAuthorized: number; summary: string; }
interface ITUFiling { id: string; networkName: string; administration: string; filingType: 'AP30/30A' | 'AP30B' | 'Art.9 Coordination' | 'Art.11 Notification' | 'Due Diligence'; serviceBand: string; orbitType: 'GSO' | 'NGSO' | 'HEO' | 'MEO'; status: FilingStatus; dateFiled: string; satellites?: number; summary: string; }
interface SECFiling { id: string; company: string; ticker: string; filingType: '10-K' | '10-Q' | '8-K' | 'S-1' | 'DEF 14A' | '13F' | 'SC 13D'; dateFiled: string; period?: string; summary: string; keyMetric?: string; keyMetricLabel?: string; url: string; }
interface FederalRegisterEntry { id: string; agency: string; title: string; documentType: 'Proposed Rule' | 'Final Rule' | 'Notice' | 'Presidential Document' | 'Request for Comment'; federalRegisterNumber: string; publishedDate: string; commentDeadline?: string; effectiveDate?: string; impact: 'high' | 'medium' | 'low'; summary: string; docket?: string; }

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

let FCC_FILINGS: FCCFiling[] = [];
let FAA_LICENSES: FAALicense[] = [];
let ITU_FILINGS: ITUFiling[] = [];
let SEC_FILINGS: SECFiling[] = [];
let FEDERAL_REGISTER_ENTRIES: FederalRegisterEntry[] = [];
type FilingsTabId = 'fcc' | 'faa' | 'itu' | 'sec' | 'federal-register';

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
    withdrawn: 'bg-slate-500/20 text-slate-400',
    superseded: 'bg-slate-500/20 text-slate-400',
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
      <h4 className="font-semibold text-slate-900 mb-2">{policy.title}</h4>
      <p className="text-slate-400 text-sm mb-3 line-clamp-3">{policy.summary}</p>
      <div className="bg-slate-50 rounded-lg p-3 mb-3">
        <h5 className="text-xs font-semibold text-slate-700 mb-1">Impact Analysis</h5>
        <p className="text-xs text-slate-400 line-clamp-2">{policy.impactAnalysis}</p>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {policy.affectedParties.slice(0, 3).map((party, i) => (
          <span key={i} className="text-xs bg-nebula-500/10 text-nebula-300 px-2 py-0.5 rounded">{party.replace(/_/g, ' ')}</span>
        ))}
        {policy.affectedParties.length > 3 && (<span className="text-xs text-slate-400">+{policy.affectedParties.length - 3} more</span>)}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{policy.federalRegisterCitation || `Published: ${new Date(policy.publishedDate).toLocaleDateString()}`}</span>
        {deadline && (<span className={`${isUrgent ? 'text-yellow-500 font-semibold' : 'text-slate-400'}`}>{isUrgent && '\u26A0\uFE0F '}Comments due: {deadline.toLocaleDateString()}</span>)}
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
                <p className="text-xs text-slate-400 mt-1">{d.date.toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Agencies</option><option value="FAA">FAA (Launches)</option><option value="FCC">FCC (Spectrum)</option><option value="NOAA">NOAA (Remote Sensing)</option><option value="BIS">BIS (Export Controls)</option><option value="DDTC">DDTC (ITAR)</option><option value="NASA">NASA</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm">
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
      <h4 className="font-semibold text-slate-900 mb-2">{license.licenseType}</h4>
      <p className="text-slate-400 text-sm mb-3">{license.description}</p>
      <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
        {license.applicationFee && (<span>Application: ${license.applicationFee.toLocaleString()}</span>)}
        {license.annualFee && (<span>Annual: ${license.annualFee.toLocaleString()}</span>)}
        {license.validityYears && (<span>Valid: {license.validityYears} years</span>)}
      </div>
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200 mb-3">{expanded ? 'Hide Requirements \u25B2' : 'Show Requirements \u25BC'}</button>
      {expanded && (
        <div className="bg-slate-50 rounded-lg p-3 mt-2">
          <h5 className="text-xs font-semibold text-slate-700 mb-2">Requirements Checklist</h5>
          <ul className="space-y-1">
            {(JSON.parse(JSON.stringify(license.requirements)) as string[]).map((req, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-400"><span className="text-nebula-300 mt-0.5">{'\u2610'}</span>{req}</li>))}
          </ul>
          <div className="mt-3 pt-3 border-t border-slate-200"><h5 className="text-xs font-semibold text-slate-700 mb-1">Regulatory Basis</h5><p className="text-xs text-slate-400">{license.regulatoryBasis}</p></div>
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
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All License Types</option><option value="launch">Launch Licenses (FAA)</option><option value="satellite">Satellite Licenses (FCC)</option><option value="remote_sensing">Remote Sensing (NOAA)</option><option value="spectrum">Spectrum (ITU/FCC)</option><option value="export">Export Licenses</option>
        </select>
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Agencies</option><option value="FAA">FAA</option><option value="FCC">FCC</option><option value="NOAA">NOAA</option>
        </select>
      </div>
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5">{filteredLicenses.map((license) => (<StaggerItem key={license.id}><LicenseCard license={license} /></StaggerItem>))}</StaggerContainer>
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">International Treaty Obligations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TREATY_OBLIGATIONS.map((treaty) => (
            <div key={treaty.id} className="card p-4">
              <div className="flex items-start justify-between mb-2"><h4 className="font-semibold text-slate-900">{treaty.name}</h4>{treaty.usRatified && (<span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">US Ratified</span>)}</div>
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
  const outcomeColors = { plaintiff_victory: 'bg-green-500/20 text-green-400', defendant_victory: 'bg-red-500/20 text-red-400', settlement: 'bg-yellow-500/20 text-yellow-400', dismissed: 'bg-slate-500/20 text-slate-400', pending: 'bg-blue-500/20 text-blue-400', vacated: 'bg-purple-500/20 text-purple-400' };
  const jurisdictionIcons = { federal: '\uD83C\uDFDB\uFE0F', international: '\uD83C\uDF0D', arbitration: '\u2696\uFE0F', state: '\uD83C\uDFE2', gao: '\uD83D\uDCCA' };
  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2"><span className="text-xl">{jurisdictionIcons[lawCase.jurisdiction]}</span><span className="text-xs text-slate-400">{lawCase.year}</span></div>
        <span className={`text-xs px-2 py-1 rounded ${outcomeColors[lawCase.outcome]}`}>{lawCase.outcome.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
      </div>
      <h4 className="font-semibold text-slate-900 mb-1">{lawCase.caseName}</h4>
      {lawCase.citation && (<p className="text-xs text-slate-400 mb-2 font-mono">{lawCase.citation}</p>)}
      <p className="text-slate-400 text-sm mb-3 line-clamp-3">{lawCase.summary}</p>
      <div className="flex flex-wrap gap-1 mb-3">{lawCase.subjectMatter.map((subject, i) => (<span key={i} className="text-xs bg-nebula-500/10 text-nebula-300 px-2 py-0.5 rounded">{subject.replace(/_/g, ' ')}</span>))}</div>
      {lawCase.damages && (<div className="text-sm font-semibold text-green-600 mb-3">Damages: ${lawCase.damages.toLocaleString()}</div>)}
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-nebula-300 hover:text-nebula-200">{expanded ? 'Show Less \u25B2' : 'Read More \u25BC'}</button>
      {expanded && (
        <div className="mt-4 space-y-4">
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1">Parties</h5><p className="text-xs text-slate-400"><strong>Plaintiff:</strong> {lawCase.parties.plaintiff}<br /><strong>Defendant:</strong> {lawCase.parties.defendant}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1">Facts</h5><p className="text-xs text-slate-400">{lawCase.facts}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1">Holdings</h5><ul className="text-xs text-slate-400 list-disc list-inside space-y-1">{lawCase.holdings.map((holding, i) => (<li key={i}>{holding}</li>))}</ul></div>
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1">Significance</h5><p className="text-xs text-slate-400">{lawCase.significance}</p></div>
          <div><h5 className="text-xs font-semibold text-slate-700 mb-1">Precedent Value</h5><p className="text-xs text-slate-400">{lawCase.precedentValue}</p></div>
          {lawCase.keyQuotes && lawCase.keyQuotes.length > 0 && (<div><h5 className="text-xs font-semibold text-slate-700 mb-1">Key Quotes</h5>{lawCase.keyQuotes.map((quote, i) => (<blockquote key={i} className="text-xs text-slate-400 italic border-l-2 border-nebula-500 pl-2 mb-1">&ldquo;{quote}&rdquo;</blockquote>))}</div>)}
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
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-slate-900">{filteredCases.length}</div><div className="text-xs text-slate-400">Cases</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-green-400">${(totalDamages / 1e9).toFixed(2)}B</div><div className="text-xs text-slate-400">Total Damages</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-nebula-300">{filteredCases.filter(c => c.outcome === 'plaintiff_victory').length}</div><div className="text-xs text-slate-400">Plaintiff Wins</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold text-yellow-400">{filteredCases.filter(c => c.outcome === 'settlement').length}</div><div className="text-xs text-slate-400">Settlements</div></div>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={jurisdictionFilter} onChange={(e) => setJurisdictionFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Jurisdictions</option><option value="federal">Federal Courts</option><option value="international">International</option><option value="arbitration">Arbitration</option>
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm">
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
      <div className="mb-6"><input type="text" placeholder="Search classifications..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-96 bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-4 py-2 text-sm placeholder:text-slate-400" /></div>
      {activeSubTab === 'eccn' && (
        <div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-blue-400 mb-2">Export Administration Regulations (EAR)</h4><p className="text-sm text-slate-400">The Commerce Control List (CCL) classifies dual-use items by Export Control Classification Number (ECCN). Commercial satellites were transferred from ITAR to EAR via the 9x515 series in 2014.</p></div>
          <div className="space-y-4">{filteredECCNs.map((eccn) => (
            <div key={eccn.id} className="card p-5">
              <div className="flex items-start justify-between mb-3"><span className="font-mono text-lg font-bold text-blue-400">{eccn.eccn}</span><span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-1 rounded">{eccn.category}</span></div>
              <h4 className="font-semibold text-slate-900 mb-2">{eccn.description}</h4><p className="text-sm text-slate-400 mb-3">{eccn.spaceRelevance}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div><h5 className="font-semibold text-slate-700 mb-1">Reason for Control</h5><div className="flex flex-wrap gap-1">{eccn.reasonForControl.map((r, i) => (<span key={i} className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">{r}</span>))}</div></div>
                <div><h5 className="font-semibold text-slate-700 mb-1">License Exceptions</h5><div className="flex flex-wrap gap-1">{eccn.licenseExceptions.map((e, i) => (<span key={i} className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded">{e}</span>))}</div></div>
              </div>
              <div className="mt-3"><h5 className="text-xs font-semibold text-slate-700 mb-1">Examples</h5><ul className="text-xs text-slate-400 list-disc list-inside">{eccn.examples.slice(0, 3).map((ex, i) => (<li key={i}>{ex}</li>))}</ul></div>
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
              <h4 className="font-semibold text-slate-900 mb-2">{usml.title}</h4><p className="text-sm text-slate-400 mb-3">{usml.description}</p>
              <div className="mb-3"><h5 className="text-xs font-semibold text-slate-700 mb-1">Controlled Items</h5><ul className="text-xs text-slate-400 list-disc list-inside">{usml.items.map((item, i) => (<li key={i}>{item}</li>))}</ul></div>
              <div className="bg-slate-50 rounded p-3"><h5 className="text-xs font-semibold text-slate-700 mb-1">Space Relevance</h5><p className="text-xs text-slate-400">{usml.spaceRelevance}</p></div>
              {usml.exemptions && usml.exemptions.length > 0 && (<div className="mt-3"><h5 className="text-xs font-semibold text-slate-700 mb-1">Exemptions / Notes</h5><ul className="text-xs text-slate-400 list-disc list-inside">{usml.exemptions.map((ex, i) => (<li key={i}>{ex}</li>))}</ul></div>)}
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
            <div className="flex items-start justify-between mb-3"><span className="text-3xl">{typeInfo?.icon || '\uD83D\uDCCB'}</span><span className={`text-xs px-2 py-1 rounded ${typeInfo?.color || 'bg-slate-100'}`}>{typeInfo?.label || source.type}</span></div>
            <h4 className="font-semibold text-slate-900 mb-1 group-hover:text-nebula-300 transition-colors">{source.name}</h4>
            {source.organization && (<p className="text-sm text-slate-400 mb-2">{source.organization}</p>)}
            <p className="text-xs text-slate-400 mb-3 line-clamp-2">{source.description}</p>
            <div className="flex flex-wrap gap-1">{source.topics.slice(0, 3).map((topic, i) => (<span key={i} className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">{topic.replace(/_/g, ' ')}</span>))}</div>
            {source.keyContributors && source.keyContributors.length > 0 && (<div className="mt-3 pt-3 border-t border-slate-100"><p className="text-xs text-slate-400"><strong>Contributors:</strong> {source.keyContributors.join(', ')}</p></div>)}
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

function SpaceLawTreatiesTab() {
  return (
    <div>
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-blue-400 mb-2">United Nations Space Treaty Framework</h4><p className="text-sm text-slate-400">Five core UN treaties form the foundation of international space law. The Outer Space Treaty (1967) serves as the cornerstone, with four supplementary treaties addressing specific aspects of space activities.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{TREATIES.map((treaty) => (<TreatyCard key={treaty.id} treaty={treaty} />))}</div>
      <div className="card p-5 border-dashed mt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Treaty Ratification Overview</h3>
        <div className="space-y-3">{TREATIES.map((treaty) => { const maxRatifications = 114; const pct = (treaty.ratifications / maxRatifications) * 100; return (<div key={treaty.id}><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-600 font-medium">{treaty.name}</span><span className="text-sm text-slate-400">{treaty.ratifications} ratifications</span></div><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${treaty.status === 'not_in_force' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-gradient-to-r from-cyan-500 to-blue-400'}`} style={{ width: `${pct}%` }} /></div></div>); })}</div>
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

function SpaceLawNationalTab() {
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const countries = useMemo(() => Array.from(new Set(NATIONAL_LAWS.map(l => l.country))).sort(), []);
  const filteredLaws = useMemo(() => { let result = [...NATIONAL_LAWS]; if (countryFilter) result = result.filter(l => l.country === countryFilter); if (statusFilter) result = result.filter(l => l.status === statusFilter); return result; }, [countryFilter, statusFilter]);
  return (
    <div>
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-cyan-600 mb-2">National Space Legislation Tracker</h4><p className="text-sm text-slate-400">As commercial space activities expand, nations are rapidly developing domestic legislation to regulate launches, satellite operations, space resources, and liability. This tracker monitors major national frameworks.</p></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div><label className="block text-slate-400 text-sm mb-1">Country</label><select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Countries</option>{countries.map(c => (<option key={c} value={c}>{c}</option>))}</select></div>
        <div><label className="block text-slate-400 text-sm mb-1">Status</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Statuses</option><option value="enacted">Enacted</option><option value="amended">Amended</option><option value="proposed">Proposed</option><option value="under_review">Under Review</option></select></div>
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
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-slate-900 mb-2">About the Artemis Accords</h3><p className="text-slate-500 text-sm mb-4">The Artemis Accords are a set of bilateral agreements between the United States and partner nations, grounded in the Outer Space Treaty. Established in 2020 by NASA, they set principles for the responsible and peaceful exploration of the Moon, Mars, and other celestial bodies as part of the Artemis program.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-green-400">{ARTEMIS_SIGNATORIES.length}</div><div className="text-slate-400 text-xs">Total Signatories</div></div>
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-cyan-400">{Object.keys(regionCounts).length}</div><div className="text-slate-400 text-xs">Regions</div></div>
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-400">{ARTEMIS_SIGNATORIES.filter(s => s.implementationStatus === 'implementing').length}</div><div className="text-slate-400 text-xs">Implementing</div></div>
          <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-purple-400">{ARTEMIS_PRINCIPLES.length}</div><div className="text-slate-400 text-xs">Core Principles</div></div>
        </div>
      </div>
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-slate-900 mb-4">Core Principles</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{ARTEMIS_PRINCIPLES.map((principle, i) => (<div key={i} className="bg-slate-50/50 border border-slate-200/30 rounded-lg p-4"><div className="flex items-center gap-2 mb-1"><span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-600 text-xs font-bold flex items-center justify-center">{i + 1}</span><h5 className="font-medium text-slate-900 text-sm">{principle.title}</h5></div><p className="text-xs text-slate-500 ml-8">{principle.description}</p></div>))}</div></div>
      <div className="card p-6 mb-6"><h3 className="text-lg font-semibold text-slate-900 mb-3">Regional Distribution</h3><div className="space-y-3">{Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).map(([region, count]) => { const maxCount = Math.max(...Object.values(regionCounts)); const pct = (count / maxCount) * 100; return (<div key={region}><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-600 font-medium">{region}</span><span className="text-sm text-slate-400">{count} signatories</span></div><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} /></div></div>); })}</div></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]"><label className="block text-slate-400 text-sm mb-1">Search</label><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search countries, agencies..." className="w-full bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400" /></div>
        <div><label className="block text-slate-400 text-sm mb-1">Region</label><select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Regions</option>{regions.map(r => (<option key={r} value={r}>{r} ({regionCounts[r]})</option>))}</select></div>
        {(regionFilter || searchQuery) && (<button onClick={() => { setRegionFilter(''); setSearchQuery(''); }} className="text-sm text-nebula-300 hover:text-nebula-200 py-2">Clear Filters</button>)}
      </div></div>
      <div className="flex items-center justify-between mb-4"><span className="text-sm text-slate-400">Showing {filteredSignatories.length} of {ARTEMIS_SIGNATORIES.length} signatories</span></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredSignatories.map((signatory) => { const status = ARTEMIS_STATUS_CONFIG[signatory.implementationStatus] || DEFAULT_ARTEMIS_STATUS; return (<div key={signatory.id} className="card p-4 hover:border-cyan-500/30 transition-all"><div className="flex items-start justify-between mb-2"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-600/40 flex items-center justify-center text-sm font-bold text-slate-600">{signatory.countryCode}</div><div><h4 className="font-semibold text-slate-900 text-sm">{signatory.country}</h4><span className="text-slate-400 text-xs">{signatory.spaceAgency}</span></div></div><span className={`text-xs px-2 py-0.5 rounded border ${status.bg} ${status.text} ${status.border}`}>{status.label}</span></div><div className="flex items-center gap-3 text-xs text-slate-400 mb-2"><span>Signed: {new Date(signatory.dateSigned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span><span>{signatory.region}</span></div><p className="text-xs text-slate-500 line-clamp-2">{signatory.notes}</p></div>); })}</div>
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

function SpaceLawProceedingsTab() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const types = useMemo(() => Array.from(new Set(LEGAL_PROCEEDINGS.map(p => p.type))).sort(), []);
  const filteredProceedings = useMemo(() => { let result = [...LEGAL_PROCEEDINGS]; if (typeFilter) result = result.filter(p => p.type === typeFilter); if (statusFilter) result = result.filter(p => p.status === statusFilter); return result.sort((a, b) => b.year - a.year); }, [typeFilter, statusFilter]);
  return (
    <div>
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-red-400 mb-2">Space Law Cases and Legal Proceedings</h4><p className="text-sm text-slate-400">Tracking notable legal disputes, regulatory enforcement actions, and advisory opinions that shape the evolving body of space law. Includes both international and domestic proceedings.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-slate-900">{LEGAL_PROCEEDINGS.length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Cases</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-red-400">{LEGAL_PROCEEDINGS.filter(p => p.status === 'active').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Active</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-green-400">{LEGAL_PROCEEDINGS.filter(p => p.status === 'resolved').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Resolved</div></div>
        <div className="card-elevated p-4 text-center"><div className="text-2xl font-bold font-display text-yellow-400">{LEGAL_PROCEEDINGS.filter(p => p.status === 'pending').length}</div><div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Pending</div></div>
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

function SpaceLawBodiesTab() {
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const filteredBodies = useMemo(() => { let result = [...REGULATORY_BODIES]; if (typeFilter) result = result.filter(b => b.type === typeFilter); if (searchQuery) { const query = searchQuery.toLowerCase(); result = result.filter(b => b.name.toLowerCase().includes(query) || b.abbreviation.toLowerCase().includes(query) || b.mandate.toLowerCase().includes(query) || b.headquarters.toLowerCase().includes(query)); } return result; }, [typeFilter, searchQuery]);
  return (
    <div>
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6"><h4 className="font-semibold text-purple-600 mb-2">Space Regulatory Bodies Directory</h4><p className="text-sm text-slate-400">Comprehensive directory of international, regional, and national regulatory bodies governing space activities. From UN organizations to national licensing authorities and industry coordination groups.</p></div>
      <div className="card p-4 mb-6"><div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]"><label className="block text-slate-400 text-sm mb-1">Search</label><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search bodies, functions..." className="w-full bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400" /></div>
        <div><label className="block text-slate-400 text-sm mb-1">Type</label><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-slate-800/80 border border-slate-600/50 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"><option value="">All Types</option><option value="un">UN Bodies</option><option value="national">National</option><option value="regional">Regional</option><option value="industry">Industry</option></select></div>
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
        <input type="text" placeholder="Search applicant, file number, band..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={orbitFilter} onChange={(e) => setOrbitFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Orbits</option>{uniqueOrbits.map((o) => (<option key={o} value={o}>{o}</option>))}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Statuses</option>{uniqueStatuses.map((s) => (<option key={s} value={s}>{(FILING_STATUS_STYLES[s] || DEFAULT_FILING_STATUS_STYLE).label}</option>))}</select>
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
        <input type="text" placeholder="Search licensee, vehicle, launch site..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Statuses</option>{uniqueStatuses.map((s) => (<option key={s} value={s}>{(FILING_STATUS_STYLES[s] || DEFAULT_FILING_STATUS_STYLE).label}</option>))}</select>
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
        <input type="text" placeholder="Search network name, administration..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={orbitFilter} onChange={(e) => setOrbitFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Orbits</option>{uniqueOrbits.map((o) => (<option key={o} value={o}>{o}</option>))}</select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Filing Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
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
        <input type="text" placeholder="Search company, ticker, content..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Companies</option>{uniqueTickers.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Filing Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
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
        <input type="text" placeholder="Search title, agency, content..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Agencies</option>{uniqueAgencies.map((a) => (<option key={a} value={a}>{a}</option>))}</select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Types</option>{uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
        <select value={impactFilter} onChange={(e) => setImpactFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Impact Levels</option><option value="high">High Impact</option><option value="medium">Medium Impact</option><option value="low">Low Impact</option></select>
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
        <input type="text" placeholder="Search case, protester, awardee..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px] bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm placeholder:text-star-300/50 focus:outline-none focus:border-nebula-500/50" />
        <select value={forumFilter} onChange={(e) => setForumFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Forums</option>{uniqueForums.map((f) => (<option key={f} value={f}>{PROTEST_FORUM_STYLES[f].label}</option>))}</select>
        <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Outcomes</option>{uniqueOutcomes.map((o) => (<option key={o} value={o}>{PROTEST_OUTCOME_STYLES[o].label}</option>))}</select>
        <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Programs</option>{uniquePrograms.map((p) => (<option key={p} value={p}>{PROTEST_PROGRAM_LABELS[p]}</option>))}</select>
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="bg-white/5 border border-white/10 text-star-300 rounded-lg px-3 py-2 text-sm"><option value="">All Agencies</option>{uniqueAgencies.map((a) => (<option key={a} value={a}>{a}</option>))}</select>
        <span className="text-xs text-star-300 ml-auto">{filtered.length} cases</span>
      </div></div>

      <div className="space-y-4">{filtered.map((protest) => {
        const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome];
        const forumStyle = PROTEST_FORUM_STYLES[protest.forum];
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
                  <span className="mx-2 text-white/20">|</span>
                  <span>Program: <span className="text-nebula-300">{PROTEST_PROGRAM_LABELS[protest.program]}</span></span>
                  {protest.judge && (<><span className="mx-2 text-white/20">|</span><span>{protest.judge}</span></>)}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10 mt-3">
              <span>Filed: <span className="text-white font-medium">{protest.yearFiled}</span></span>
              <span className="text-white/20">|</span>
              <span>Decided: <span className="text-white font-medium">{protest.decisionDate}</span></span>
              <span className="text-white/20">|</span>
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
                const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome];
                const forumStyle = PROTEST_FORUM_STYLES[protest.forum];
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
                      <span className="text-white/20">|</span>
                      <span>{protest.agency}</span>
                      <span className="text-white/20">|</span>
                      <span className="text-white font-medium">{protest.contractValue}</span>
                      <span className="text-white/20">|</span>
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
              const style = PROTEST_OUTCOME_STYLES[outcome as ProtestOutcome];
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
        <div className="overflow-x-auto">
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
                const outcomeStyle = PROTEST_OUTCOME_STYLES[protest.outcome];
                const forumStyle = PROTEST_FORUM_STYLES[protest.forum];
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
      </div>
    </div>
  );
}

// ############################################################################
// MAIN PAGE - Two-Level Tab System
// ############################################################################

type TopSection = 'compliance' | 'space-law' | 'filings' | 'protests';

function getTopSectionFromTab(tab: string): TopSection {
  const complianceTabs = ['policy', 'wizard', 'cases', 'export', 'experts'];
  const spaceLawTabs = ['treaties', 'national', 'artemis', 'proceedings', 'bodies'];
  const filingsTabs = ['fcc', 'faa', 'itu', 'sec', 'federal-register'];
  const protestTabs = ['protests-overview', 'protests-timeline', 'protests-analysis'];
  if (complianceTabs.includes(tab)) return 'compliance';
  if (spaceLawTabs.includes(tab)) return 'space-law';
  if (filingsTabs.includes(tab)) return 'filings';
  if (protestTabs.includes(tab)) return 'protests';
  return 'compliance';
}

function getDefaultSubTab(section: TopSection): string {
  if (section === 'compliance') return 'policy';
  if (section === 'space-law') return 'treaties';
  if (section === 'filings') return 'fcc';
  if (section === 'protests') return 'protests-overview';
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
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const stats = getRegulatoryHubStats();

  // Fetch data from DynamicContent API
  useEffect(() => {
    async function fetchData() {
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
      } catch (error) {
        console.error('Failed to fetch compliance data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Sync tab to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeSubTab !== 'policy') params.set('tab', activeSubTab);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [activeSubTab, router, pathname]);

  const handleSectionChange = (section: TopSection) => {
    setActiveSection(section);
    const defaultTab = getDefaultSubTab(section);
    setActiveSubTab(defaultTab);
  };

  const topSections: { id: TopSection; label: string; icon: string }[] = [
    { id: 'compliance', label: 'Compliance', icon: '\uD83D\uDCCB' },
    { id: 'space-law', label: 'Space Law', icon: '\u2696\uFE0F' },
    { id: 'filings', label: 'Regulatory Filings', icon: '\uD83D\uDCC4' },
    { id: 'protests', label: 'Bid Protests & Claims', icon: '\uD83C\uDFDB\uFE0F' },
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
    <>
      {/* Stats Overview */}
      <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" className="mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{stats.totalPolicies}</div>
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
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {topSections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleSectionChange(section.id)}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-lg font-semibold text-sm transition-all whitespace-nowrap touch-target ${
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

      {/* Sub-Tab Navigation */}
      {activeSection === 'compliance' && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {complianceSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap touch-target ${
                activeSubTab === tab.id
                  ? 'bg-slate-700/80 text-slate-100 border-slate-500/50 shadow-glow-sm'
                  : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'space-law' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {spaceLawSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-slate-700/80 text-slate-100 border border-slate-500/50 shadow-glow-sm'
                  : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'filings' && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {getFilingsTabs().map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
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
                  : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
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
      {activeSubTab === 'treaties' && <SpaceLawTreatiesTab />}
      {activeSubTab === 'national' && <SpaceLawNationalTab />}
      {activeSubTab === 'artemis' && <SpaceLawArtemisTab />}
      {activeSubTab === 'proceedings' && <SpaceLawProceedingsTab />}
      {activeSubTab === 'bodies' && <SpaceLawBodiesTab />}
      {activeSubTab === 'fcc' && <FilingsFCCTab />}
      {activeSubTab === 'faa' && <FilingsFAATab />}
      {activeSubTab === 'itu' && <FilingsITUTab />}
      {activeSubTab === 'sec' && <FilingsSECTab />}
      {activeSubTab === 'federal-register' && <FilingsFederalRegisterTab />}
      {activeSubTab === 'protests-overview' && <ProtestsOverviewTab />}
      {activeSubTab === 'protests-timeline' && <ProtestsTimelineTab />}
      {activeSubTab === 'protests-analysis' && <ProtestsAnalysisTab />}
    </>
  );
}

export default function RegulatoryHubPage() {
  return (
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
      </div>
    </div>
  );
}
