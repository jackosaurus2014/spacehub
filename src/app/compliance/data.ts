// ────────────────────────────────────────
// Static Data for Compliance page
// Extracted for code-splitting / tree-shaking
// ────────────────────────────────────────

// SPACE LAW - Types, Status Configs, and Data
// ############################################################################

export type SpaceLawTabId = 'treaties' | 'national' | 'artemis' | 'proceedings' | 'bodies';

export type TreatyStatus = 'in_force' | 'open' | 'not_in_force';
export type NationalLawStatus = 'enacted' | 'amended' | 'proposed' | 'under_review';
export type ArtemisStatus = 'signatory' | 'implementing' | 'observer';
export type ProceedingStatus = 'active' | 'resolved' | 'pending' | 'advisory';
export type BodyType = 'un' | 'national' | 'regional' | 'industry';

export interface Treaty {
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

export interface NationalLaw {
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

export interface ArtemisSignatory {
  id: string;
  country: string;
  countryCode: string;
  dateSigned: string;
  region: string;
  spaceAgency: string;
  implementationStatus: ArtemisStatus;
  notes: string;
}

export interface LegalProceeding {
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

export interface RegulatoryBody {
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

export const TREATY_STATUS_CONFIG: Record<TreatyStatus, { label: string; bg: string; text: string; border: string }> = {
  in_force: { label: 'In Force', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  open: { label: 'Open for Signature', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  not_in_force: { label: 'Not Widely Ratified', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

export const DEFAULT_TREATY_STATUS = { label: 'Unknown', bg: 'bg-white/[0.02]', text: 'text-slate-400', border: 'border-slate-500/30' };

export const NATIONAL_STATUS_CONFIG: Record<NationalLawStatus, { label: string; bg: string; text: string; border: string }> = {
  enacted: { label: 'Enacted', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  amended: { label: 'Amended', bg: 'bg-slate-500/20', text: 'text-white/70', border: 'border-slate-500/30' },
  proposed: { label: 'Proposed', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  under_review: { label: 'Under Review', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
};

export const DEFAULT_NATIONAL_STATUS = { label: 'Unknown', bg: 'bg-white/[0.02]', text: 'text-slate-400', border: 'border-slate-500/30' };

export const ARTEMIS_STATUS_CONFIG: Record<ArtemisStatus, { label: string; bg: string; text: string; border: string }> = {
  signatory: { label: 'Signatory', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  implementing: { label: 'Implementing', bg: 'bg-slate-500/20', text: 'text-white/70', border: 'border-slate-500/30' },
  observer: { label: 'Observer', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

export const DEFAULT_ARTEMIS_STATUS = { label: 'Unknown', bg: 'bg-white/[0.02]', text: 'text-slate-400', border: 'border-slate-500/30' };

export const PROCEEDING_STATUS_CONFIG: Record<ProceedingStatus, { label: string; bg: string; text: string; border: string }> = {
  active: { label: 'Active', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  resolved: { label: 'Resolved', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  pending: { label: 'Pending', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  advisory: { label: 'Advisory', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
};

export const DEFAULT_PROCEEDING_STATUS = { label: 'Unknown', bg: 'bg-white/[0.02]', text: 'text-slate-400', border: 'border-slate-500/30' };

export const BODY_TYPE_CONFIG: Record<BodyType, { label: string; bg: string; text: string; border: string }> = {
  un: { label: 'UN Body', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  national: { label: 'National', bg: 'bg-slate-500/20', text: 'text-white/70', border: 'border-slate-500/30' },
  regional: { label: 'Regional', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  industry: { label: 'Industry', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
};

export const DEFAULT_BODY_TYPE = { label: 'Unknown', bg: 'bg-white/[0.02]', text: 'text-slate-400', border: 'border-slate-500/30' };

// ############################################################################
// REGULATORY FILINGS - Types, Status Configs, and Data
// ############################################################################

export type FilingStatus = 'granted' | 'pending' | 'denied' | 'dismissed' | 'amended' | 'active' | 'expired' | 'proposed' | 'final' | 'comment';

export interface FCCFiling { id: string; callSign?: string; fileNumber: string; applicant: string; filingType: string; band: string; orbitType: 'NGSO' | 'GSO' | 'HEO' | 'MEO'; status: FilingStatus; dateFiled: string; dateActedOn?: string; satelliteCount?: number; summary: string; docket?: string; }
export interface FAALicense { id: string; licenseNumber: string; licensee: string; licenseType: 'Launch' | 'Reentry' | 'Launch Site' | 'Launch/Reentry'; vehicle: string; launchSite: string; status: FilingStatus; dateIssued: string; expirationDate: string; missionsAuthorized: number; summary: string; }
export interface ITUFiling { id: string; networkName: string; administration: string; filingType: 'AP30/30A' | 'AP30B' | 'Art.9 Coordination' | 'Art.11 Notification' | 'Due Diligence'; serviceBand: string; orbitType: 'GSO' | 'NGSO' | 'HEO' | 'MEO'; status: FilingStatus; dateFiled: string; satellites?: number; summary: string; }
export interface SECFiling { id: string; company: string; ticker: string; filingType: '10-K' | '10-Q' | '8-K' | 'S-1' | 'DEF 14A' | '13F' | 'SC 13D'; dateFiled: string; period?: string; summary: string; keyMetric?: string; keyMetricLabel?: string; url: string; }
export interface FederalRegisterEntry { id: string; agency: string; title: string; documentType: 'Proposed Rule' | 'Final Rule' | 'Notice' | 'Presidential Document' | 'Request for Comment'; federalRegisterNumber: string; publishedDate: string; commentDeadline?: string; effectiveDate?: string; impact: 'high' | 'medium' | 'low'; summary: string; docket?: string; }

export const FILING_STATUS_STYLES: Record<FilingStatus, { label: string; bg: string; text: string }> = {
  granted: { label: 'Granted', bg: 'bg-green-500/20', text: 'text-green-400' },
  pending: { label: 'Pending', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  denied: { label: 'Denied', bg: 'bg-red-500/20', text: 'text-red-400' },
  dismissed: { label: 'Dismissed', bg: 'bg-white/[0.02]', text: 'text-slate-400' },
  amended: { label: 'Amended', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  active: { label: 'Active', bg: 'bg-green-500/20', text: 'text-green-400' },
  expired: { label: 'Expired', bg: 'bg-white/[0.02]', text: 'text-slate-400' },
  proposed: { label: 'Proposed', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  final: { label: 'Final Rule', bg: 'bg-green-500/20', text: 'text-green-400' },
  comment: { label: 'Open for Comment', bg: 'bg-slate-500/20', text: 'text-white/70' },
};

export const DEFAULT_FILING_STATUS_STYLE = { label: 'Unknown', bg: 'bg-white/[0.02]', text: 'text-slate-400' };

export const FILING_IMPACT_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
};

export const DEFAULT_FILING_IMPACT_STYLE = { bg: 'bg-white/[0.02]', text: 'text-slate-400' };

export const FILING_ORBIT_STYLES: Record<string, { bg: string; text: string }> = {
  NGSO: { bg: 'bg-slate-500/20', text: 'text-white/70' },
  GSO: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  HEO: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  MEO: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
};

export const DEFAULT_FILING_ORBIT_STYLE = { bg: 'bg-white/[0.02]', text: 'text-slate-400' };

export type FilingsTabId = 'fcc' | 'faa' | 'itu' | 'sec' | 'federal-register';
