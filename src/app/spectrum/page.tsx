'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import ExportButton from '@/components/ui/ExportButton';
import {
  SpectrumAllocation,
  SpectrumFiling,
  SPECTRUM_BANDS,
} from '@/types';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface SpectrumStats {
  totalBands: number;
  congestedBands: number;
  totalFilings: number;
  pendingFilings: number;
  topBand: {
    bandName: string;
    filingStatus: string;
    numberOfFilings: number;
  } | null;
}

interface SpectrumData {
  allocations: SpectrumAllocation[];
  filings: SpectrumFiling[];
  stats: SpectrumStats;
}

type AuctionStatus = 'completed' | 'ongoing' | 'pending' | 'policy';

interface Auction {
  id: string;
  name: string;
  band: string;
  status: AuctionStatus;
  country: string;
  year: string;
  raised?: string;
  winnerHighlight?: string;
  relevance: string;
  details: string;
}

interface FrequencyBand {
  band: string;
  range: string;
  services: string;
  spaceRelevance: string;
  congestion: 'low' | 'medium' | 'high' | 'critical';
}

interface RegulatoryProceeding {
  id: string;
  body: string;
  title: string;
  docket: string;
  status: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  date: string;
}

// All valid tab IDs for the consolidated page
type TabId = 'bands' | 'filings' | 'coordination' | 'auctions' | 'freq-bands' | 'regulatory' | 'education' | 'lawyers';

const ALL_TABS: TabId[] = ['bands', 'filings', 'coordination', 'auctions', 'freq-bands', 'regulatory', 'education', 'lawyers'];

// ────────────────────────────────────────
// Constants (original spectrum page)
// ────────────────────────────────────────

const FILING_STATUS_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  available: { label: 'Available', color: 'text-green-400', bgColor: 'bg-green-500' },
  filed: { label: 'Filed', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  coordinating: { label: 'Coordinating', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  assigned: { label: 'Assigned', color: 'text-purple-400', bgColor: 'bg-purple-500' },
  congested: { label: 'Congested', color: 'text-red-400', bgColor: 'bg-red-500' },
};

const OPERATOR_FILING_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'approved', label: 'Approved', color: 'bg-green-500/20 text-green-400' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'coordinating', label: 'Coordinating', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'denied', label: 'Denied', color: 'bg-red-500/20 text-red-400' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-500/20 text-gray-400' },
];

const SERVICE_LABELS: Record<string, string> = {
  fixed_satellite: 'Fixed Satellite',
  mobile_satellite: 'Mobile Satellite',
  earth_exploration: 'Earth Exploration',
  radio_astronomy: 'Radio Astronomy',
  inter_satellite: 'Inter-Satellite',
};

// ── Export column definitions ──

const FILING_EXPORT_COLUMNS = [
  { key: 'operator', label: 'Operator' },
  { key: 'system', label: 'System Name' },
  { key: 'bandName', label: 'Band' },
  { key: 'frequencyRange', label: 'Frequency Range' },
  { key: 'orbitType', label: 'Orbit Type' },
  { key: 'status', label: 'Status' },
  { key: 'filingDate', label: 'Filed Date' },
  { key: 'grantDate', label: 'Approval Date' },
  { key: 'expiryDate', label: 'Expiry Date' },
  { key: 'agency', label: 'Agency' },
  { key: 'filingId', label: 'Filing ID' },
  { key: 'numberOfSatellites', label: 'Satellites' },
  { key: 'description', label: 'Description' },
];

const ALLOCATION_EXPORT_COLUMNS = [
  { key: 'bandName', label: 'Band Name' },
  { key: 'frequencyRange', label: 'Frequency Range' },
  { key: 'allocationType', label: 'Allocation Type' },
  { key: 'service', label: 'Primary Service' },
  { key: 'region', label: 'Region' },
  { key: 'filingStatus', label: 'Status' },
  { key: 'assignedTo', label: 'Assigned Operator' },
  { key: 'ituReference', label: 'ITU Reference' },
  { key: 'fccReference', label: 'FCC Reference' },
];

// ── Known satellite operators for cross-module linking ──

const KNOWN_SATELLITE_OPERATORS = [
  'SpaceX', 'Starlink', 'OneWeb', 'Amazon', 'Kuiper', 'Telesat',
  'SES', 'Intelsat', 'Eutelsat', 'Viasat', 'Hughes', 'Iridium',
  'Globalstar', 'O3b', 'Boeing', 'Inmarsat', 'EchoStar',
];

// ────────────────────────────────────────
// Constants (from spectrum-auctions page)
// ────────────────────────────────────────

const AUCTIONS: Auction[] = [
  {
    id: 'fcc-110',
    name: 'FCC Auction 110 (3.45-3.55 GHz CBRS)',
    band: '3.45-3.55 GHz',
    status: 'completed',
    country: 'US',
    year: '2024',
    raised: '$22.5B',
    winnerHighlight: 'T-Mobile',
    relevance: 'Adjacent to satellite C-band',
    details: 'The CBRS mid-band auction cleared spectrum previously used by federal government and satellite operators. T-Mobile secured the largest share of licenses, strengthening its 5G mid-band holdings. The proximity to satellite C-band downlinks raises interference concerns for adjacent-band satellite operations.',
  },
  {
    id: 'fcc-107',
    name: 'FCC C-Band Auction 107 (3.7-3.98 GHz)',
    band: '3.7-3.98 GHz',
    status: 'completed',
    country: 'US',
    year: '2021',
    raised: '$81.2B',
    relevance: 'Cleared from satellite downlinks',
    details: 'The largest spectrum auction in history reallocated 280 MHz of C-band spectrum from satellite downlink use to terrestrial 5G. Incumbent satellite operators (SES, Intelsat) received relocation payments to migrate services to the upper C-band (4.0-4.2 GHz). This fundamentally changed the economics of satellite C-band operations in the US.',
  },
  {
    id: 'fcc-12ghz',
    name: 'FCC 12 GHz Band (NGSO)',
    band: '12.2-12.7 GHz',
    status: 'pending',
    country: 'US',
    year: 'TBD',
    relevance: 'Starlink downlink band, contested sharing with terrestrial 5G',
    details: 'The 12 GHz band is used by Starlink and other NGSO systems for downlinks. The MVDDS Coalition has petitioned the FCC to allow two-way terrestrial 5G use of this band. SpaceX and DISH argue this would cause harmful interference to satellite services. The FCC has an active Notice of Proposed Rulemaking (NPRM) on sharing rules.',
  },
  {
    id: 'itu-wrc23',
    name: 'ITU WRC-23 Outcomes',
    band: 'Multiple (Ka, MSS)',
    status: 'completed',
    country: 'Global',
    year: '2023',
    relevance: 'Ka-band sharing decisions, NGSO/GSO sharing framework updates, new MSS allocations',
    details: 'WRC-23 addressed several critical satellite spectrum issues: revised NGSO/GSO sharing frameworks under Article 22, new allocations for mobile-satellite services (MSS), updated Ka-band sharing rules, and identification of spectrum for IMT in bands adjacent to satellite services. Outcomes set the stage for WRC-27 agenda items.',
  },
  {
    id: 'ofcom-leo',
    name: 'Ofcom UK LEO Spectrum',
    band: 'Ku/Ka-band',
    status: 'ongoing',
    country: 'UK',
    year: '2024-2025',
    relevance: 'Ku/Ka allocations for NGSO systems in UK',
    details: 'Ofcom is conducting a comprehensive review of spectrum access for low Earth orbit (LEO) satellite systems. This includes evaluating Ku-band and Ka-band allocations, gateway earth station licensing, and interference management frameworks for constellation operators like OneWeb (now Eutelsat OneWeb) operating from the UK.',
  },
  {
    id: 'acma-ka',
    name: 'Australia ACMA Auction',
    band: 'Ka-band',
    status: 'ongoing',
    country: 'Australia',
    year: '2024-2025',
    relevance: 'Ka-band allocations for satellite broadband',
    details: 'The Australian Communications and Media Authority (ACMA) is allocating Ka-band spectrum for satellite broadband services, crucial for connecting remote and rural communities across Australia. This includes both GSO and NGSO allocations with a focus on reducing the digital divide.',
  },
  {
    id: 'india-dot',
    name: 'India DoT Satellite Spectrum',
    band: 'Multiple',
    status: 'policy',
    country: 'India',
    year: '2024-2025',
    relevance: 'Policy development for direct-to-device satellite services',
    details: 'India\'s Department of Telecommunications is developing its satellite spectrum allocation framework, including policies for direct-to-device (D2D) satellite services. Key debates include whether spectrum should be auctioned or administratively assigned, with Reliance Jio favoring auctions and Starlink/Amazon preferring administrative allocation.',
  },
  {
    id: 'brazil-anatel',
    name: 'Brazil Anatel 5G/Satellite',
    band: 'C-band',
    status: 'ongoing',
    country: 'Brazil',
    year: '2024-2025',
    relevance: 'C-band transition and satellite protection zones',
    details: 'Anatel is managing the transition of C-band spectrum from satellite to 5G use in Brazil, while establishing satellite protection zones to prevent interference with existing satellite earth stations. Brazil\'s large geographic area and reliance on satellite connectivity make this transition particularly complex.',
  },
];

const FREQUENCY_BANDS: FrequencyBand[] = [
  { band: 'L-band', range: '1-2 GHz', services: 'Mobile satellite services, GPS, Iridium, Globalstar', spaceRelevance: 'Critical for mobile satellite voice/data and navigation', congestion: 'high' },
  { band: 'S-band', range: '2-4 GHz', services: 'Weather satellites, NASA deep space, some broadband', spaceRelevance: 'Used for telemetry, tracking, and command (TT&C)', congestion: 'medium' },
  { band: 'C-band', range: '4-8 GHz', services: 'Traditional satellite TV, being cleared for 5G in lower portion', spaceRelevance: 'Legacy satellite band under pressure from 5G reallocation', congestion: 'critical' },
  { band: 'X-band', range: '8-12 GHz', services: 'Military satcom, Earth observation downlink', spaceRelevance: 'Government and defense satellite communications', congestion: 'medium' },
  { band: 'Ku-band', range: '12-18 GHz', services: 'DTH TV, NGSO broadband (Starlink, OneWeb)', spaceRelevance: 'Primary band for consumer satellite broadband', congestion: 'high' },
  { band: 'Ka-band', range: '26-40 GHz', services: 'High-throughput satellite, NGSO broadband uplink/downlink', spaceRelevance: 'Next-gen HTS capacity, growing NGSO use', congestion: 'high' },
  { band: 'V-band', range: '40-75 GHz', services: 'Next-gen satellite broadband (Starlink Gen2), experimental', spaceRelevance: 'Future capacity expansion, atmospheric challenges', congestion: 'low' },
  { band: 'Q-band', range: '33-50 GHz', services: 'Military, experimental satellite', spaceRelevance: 'Military and research applications', congestion: 'low' },
  { band: 'E-band', range: '60-90 GHz', services: 'Inter-satellite links, backhaul', spaceRelevance: 'Optical-like ISL capacity, minimal interference', congestion: 'low' },
];

const REGULATORY_PROCEEDINGS: RegulatoryProceeding[] = [
  {
    id: 'fcc-12ghz-nprm',
    body: 'FCC',
    title: '12 GHz Band Sharing Rules',
    docket: 'WT Docket No. 20-443',
    status: 'Open',
    impact: 'high',
    description: 'NPRM on whether to permit two-way terrestrial broadband in the 12.2-12.7 GHz band shared with NGSO satellite downlinks.',
    date: 'Ongoing',
  },
  {
    id: 'fcc-ngso-milestone',
    body: 'FCC',
    title: 'NGSO Deployment Milestones',
    docket: 'IB Docket No. 20-330',
    status: 'Active',
    impact: 'high',
    description: 'Revised deployment milestone rules for NGSO satellite constellations requiring 50% deployment within 6 years of authorization.',
    date: '2024',
  },
  {
    id: 'fcc-space-bureau',
    body: 'FCC',
    title: 'Space Bureau Establishment',
    docket: 'GN Docket No. 23-232',
    status: 'Implemented',
    impact: 'medium',
    description: 'New FCC Space Bureau consolidates satellite licensing, spectrum coordination, and orbital debris rules under a single bureau.',
    date: '2023',
  },
  {
    id: 'itu-wrc27-prep',
    body: 'ITU',
    title: 'WRC-27 Preparatory Studies',
    docket: 'CPM23-2',
    status: 'In Progress',
    impact: 'high',
    description: 'Preparatory studies for WRC-27 agenda items including direct-to-device satellite spectrum, V-band allocation, and updated NGSO sharing rules.',
    date: '2024-2027',
  },
  {
    id: 'itu-epfd-review',
    body: 'ITU',
    title: 'EPFD Limit Review (Article 22)',
    docket: 'ITU-R S.1503',
    status: 'Under Review',
    impact: 'high',
    description: 'Review of equivalent power flux density limits governing NGSO-to-GSO interference, critical for mega-constellation operations.',
    date: 'Ongoing',
  },
  {
    id: 'eu-satcom',
    body: 'EU',
    title: 'IRIS2 Constellation Spectrum',
    docket: 'COM/2022/57',
    status: 'Planning',
    impact: 'medium',
    description: 'EU sovereign satellite constellation (IRIS2) spectrum filings and coordination with existing operators in Ku/Ka bands.',
    date: '2024-2027',
  },
];

// ── Auction status helpers ──

const AUCTION_STATUS_STYLES: Record<AuctionStatus, { label: string; bg: string; text: string }> = {
  completed: { label: 'Completed', bg: 'bg-green-500/20', text: 'text-green-400' },
  ongoing: { label: 'Ongoing', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  pending: { label: 'Pending', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  policy: { label: 'Policy Dev', bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

const IMPACT_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400' },
};

const CONGESTION_STYLES: Record<string, { label: string; bg: string; text: string; barColor: string; percent: number }> = {
  low: { label: 'Low', bg: 'bg-green-500/20', text: 'text-green-400', barColor: 'bg-green-500', percent: 20 },
  medium: { label: 'Medium', bg: 'bg-yellow-500/20', text: 'text-yellow-400', barColor: 'bg-yellow-500', percent: 50 },
  high: { label: 'High', bg: 'bg-orange-500/20', text: 'text-orange-400', barColor: 'bg-orange-500', percent: 75 },
  critical: { label: 'Critical', bg: 'bg-red-500/20', text: 'text-red-400', barColor: 'bg-red-500', percent: 95 },
};

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatFrequency(mhz: number): string {
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(1)} GHz`;
  }
  return `${mhz.toFixed(0)} MHz`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getCongestionLevel(filingStatus: string, numberOfFilings: number): { label: string; percent: number; color: string } {
  if (filingStatus === 'congested') {
    return { label: 'High', percent: 90, color: 'bg-red-500' };
  }
  if (filingStatus === 'assigned' || filingStatus === 'coordinating') {
    const percent = Math.min(Math.max((numberOfFilings / 120) * 100, 30), 80);
    return { label: numberOfFilings > 50 ? 'Medium-High' : 'Medium', percent, color: 'bg-yellow-500' };
  }
  if (filingStatus === 'filed') {
    return { label: 'Low-Medium', percent: 35, color: 'bg-blue-500' };
  }
  return { label: 'Low', percent: 15, color: 'bg-green-500' };
}

function isKnownSatelliteOperator(operator: string): boolean {
  return KNOWN_SATELLITE_OPERATORS.some(
    (known) => operator.toLowerCase().includes(known.toLowerCase())
  );
}

/**
 * Enrich filing/allocation data with a computed frequencyRange field for export.
 */
function enrichWithFrequencyRange<T extends { frequencyMin: number; frequencyMax: number }>(
  items: T[]
): (T & { frequencyRange: string })[] {
  return items.map((item) => ({
    ...item,
    frequencyRange: `${formatFrequency(item.frequencyMin)} - ${formatFrequency(item.frequencyMax)}`,
  }));
}

// ────────────────────────────────────────
// Band Allocation Row
// ────────────────────────────────────────

function BandAllocationRow({ allocation }: { allocation: SpectrumAllocation }) {
  const statusInfo = FILING_STATUS_INFO[allocation.filingStatus] || FILING_STATUS_INFO.available;
  const bandInfo = SPECTRUM_BANDS.find((b) => b.value === allocation.bandName);
  const congestion = getCongestionLevel(allocation.filingStatus, allocation.numberOfFilings);

  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0">
            {allocation.filingStatus === 'congested' ? '!' : '~'}
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-base">
              {bandInfo?.label || allocation.bandName}
            </h4>
            <span className="text-slate-400 text-sm">
              {formatFrequency(allocation.frequencyMin)} - {formatFrequency(allocation.frequencyMax)}
            </span>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded flex items-center gap-1.5 ${statusInfo.color}`}
          style={{ backgroundColor: `color-mix(in srgb, currentColor 15%, transparent)` }}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${statusInfo.bgColor}`} />
          {statusInfo.label}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <span className="text-slate-400 text-xs block mb-1">Allocation</span>
          <span className="text-slate-900 text-sm font-medium capitalize">{allocation.allocationType}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Primary Service</span>
          <span className="text-slate-900 text-sm font-medium">{SERVICE_LABELS[allocation.service] || allocation.service}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Region</span>
          <span className="text-slate-900 text-sm font-medium">{allocation.region}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Active Filings</span>
          <span className="text-slate-900 text-sm font-medium">{allocation.numberOfFilings}</span>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-slate-400 text-xs">Congestion Level</span>
          <span className={`text-xs font-medium ${
            congestion.percent > 70 ? 'text-red-400' : congestion.percent > 40 ? 'text-yellow-400' : 'text-green-400'
          }`}>{congestion.label}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${congestion.color} rounded-full transition-all duration-500`}
            style={{ width: `${congestion.percent}%`, opacity: 0.8 }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-200">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {allocation.assignedTo && (
            <span>Assigned: <span className="text-slate-400">{allocation.assignedTo}</span></span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {allocation.ituReference && (
            <span className="text-slate-400">ITU: <span className="text-nebula-300 font-mono">{allocation.ituReference}</span></span>
          )}
          {allocation.fccReference && (
            <span className="text-slate-400">FCC: <span className="text-nebula-300 font-mono">{allocation.fccReference}</span></span>
          )}
          {allocation.coordinationRequired && (
            <span className="text-yellow-400 flex items-center gap-1">Coordination Required</span>
          )}
        </div>
      </div>

      {/* Cross-module link: View regulatory framework */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200">
        <Link
          href="/compliance"
          className="text-xs text-nebula-300 hover:text-nebula-200 underline underline-offset-2 transition-colors"
        >
          View regulatory framework
        </Link>
      </div>

      {/* Description */}
      {allocation.description && (
        <p className="text-slate-400 text-xs mt-3 leading-relaxed">{allocation.description}</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Filing Card
// ────────────────────────────────────────

function FilingCard({ filing }: { filing: SpectrumFiling }) {
  const statusEntry = OPERATOR_FILING_STATUSES.find((s) => s.value === filing.status);
  const statusClass = statusEntry?.color || 'bg-slate-100 text-slate-500';
  const statusLabel = statusEntry?.label || filing.status;

  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 text-base">{filing.operator}</h4>
          <p className="text-slate-400 text-sm mt-0.5">{filing.system}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <span className="text-slate-400 text-xs block mb-0.5">Band</span>
          <span className="text-slate-900 text-sm font-medium">{filing.bandName}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-0.5">Frequency Range</span>
          <span className="text-slate-900 text-sm font-medium">
            {formatFrequency(filing.frequencyMin)} - {formatFrequency(filing.frequencyMax)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-0.5">Orbit Type</span>
          <span className="text-slate-900 text-sm font-medium">{filing.orbitType}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-0.5">Satellites</span>
          <span className="text-slate-900 text-sm font-medium">
            {filing.numberOfSatellites?.toLocaleString() || '--'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400 mb-3 flex-wrap">
        <span>Filed: <span className="text-slate-400">{formatDate(filing.filingDate)}</span></span>
        {filing.grantDate && (
          <span>Approved: <span className="text-green-400">{formatDate(filing.grantDate)}</span></span>
        )}
        {filing.expiryDate && (
          <span>Expires: <span className="text-yellow-400">{formatDate(filing.expiryDate)}</span></span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <span className="text-xs text-slate-400">
          Agency: <span className="text-nebula-300 font-medium">{filing.agency}</span>
        </span>
        <span className="text-xs font-mono text-slate-400">{filing.filingId}</span>
      </div>

      {/* Cross-module link: operator -> orbital slots */}
      {isKnownSatelliteOperator(filing.operator) && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <Link
            href="/orbital-slots?tab=operators"
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            View {filing.operator} orbital slots
          </Link>
        </div>
      )}

      {filing.description && (
        <p className="text-slate-400 text-xs mt-3 leading-relaxed">{filing.description}</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Auction Card
// ────────────────────────────────────────

function AuctionCard({ auction }: { auction: Auction }) {
  const [expanded, setExpanded] = useState(false);
  const style = AUCTION_STATUS_STYLES[auction.status];

  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-base">{auction.name}</h4>
          <div className="flex items-center gap-3 mt-1 text-sm text-star-300">
            <span>{auction.country}</span>
            <span className="text-star-300/30">|</span>
            <span>{auction.year}</span>
            <span className="text-star-300/30">|</span>
            <span className="font-mono text-xs">{auction.band}</span>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>

      {auction.raised && (
        <div className="flex items-center gap-4 mb-3">
          <div>
            <span className="text-star-300 text-xs block mb-0.5">Total Raised</span>
            <span className="text-white text-lg font-bold font-display">{auction.raised}</span>
          </div>
          {auction.winnerHighlight && (
            <div className="ml-6">
              <span className="text-star-300 text-xs block mb-0.5">Top Winner</span>
              <span className="text-white text-sm font-medium">{auction.winnerHighlight}</span>
            </div>
          )}
        </div>
      )}

      <div className="mb-3">
        <span className="text-star-300 text-xs block mb-0.5">Satellite Relevance</span>
        <span className="text-nebula-300 text-sm font-medium">{auction.relevance}</span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-star-300 hover:text-white transition-colors flex items-center gap-1"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {expanded ? 'Less detail' : 'More detail'}
      </button>

      {expanded && (
        <p className="text-star-300 text-sm leading-relaxed mt-3 pt-3 border-t border-white/10">
          {auction.details}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Inner Content (uses useSearchParams)
// ────────────────────────────────────────

function SpectrumContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const initialTab = (searchParams.get('tab') as TabId) || 'bands';
  const initialStatus = searchParams.get('status') || '';
  const initialBand = searchParams.get('band') || '';

  const [activeTab, setActiveTab] = useState<TabId>(
    ALL_TABS.includes(initialTab) ? initialTab : 'bands'
  );
  const [data, setData] = useState<SpectrumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  // Filing filters (initialized from URL)
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [bandFilter, setBandFilter] = useState<string>(initialBand);

  // Auction status filter
  const [auctionStatusFilter, setAuctionStatusFilter] = useState<string>('');

  // ── URL sync helper ──

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (
          !value ||
          (key === 'tab' && value === 'bands') ||
          (key === 'status' && value === '') ||
          (key === 'band' && value === '')
        ) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      // When switching away from filings, remove filter params
      if (tab !== 'filings') {
        updateUrl({ tab, status: '', band: '' });
      } else {
        updateUrl({ tab, status: statusFilter, band: bandFilter });
      }
    },
    [updateUrl, statusFilter, bandFilter]
  );

  const handleStatusFilterChange = useCallback(
    (status: string) => {
      setStatusFilter(status);
      updateUrl({ status });
    },
    [updateUrl]
  );

  const handleBandFilterChange = useCallback(
    (band: string) => {
      setBandFilter(band);
      updateUrl({ band });
    },
    [updateUrl]
  );

  const handleClearFilters = useCallback(() => {
    setStatusFilter('');
    setBandFilter('');
    updateUrl({ status: '', band: '' });
  }, [updateUrl]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spectrum');
      const result = await res.json();
      if (result.error) {
        throw new Error(result.error);
      }
      setData(result);
    } catch (err) {
      console.error('Failed to fetch spectrum data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/spectrum/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize spectrum data:', error);
    } finally {
      setInitializing(false);
    }
  };

  // Compute derived stats
  const approvedFilings = data?.filings.filter((f) => f.status === 'approved').length || 0;
  const pendingFilings = data?.stats.pendingFilings || 0;

  // Filtered filings
  const filteredFilings = (data?.filings || []).filter((f) => {
    if (statusFilter && f.status !== statusFilter) return false;
    if (bandFilter && f.bandName !== bandFilter) return false;
    return true;
  });

  // Get unique bands from filings for the band filter
  const filingBands = Array.from(new Set((data?.filings || []).map((f) => f.bandName))).sort();

  // Enriched data for export (with computed frequencyRange)
  const enrichedFilings = enrichWithFrequencyRange(filteredFilings);
  const enrichedAllocations = data ? enrichWithFrequencyRange(data.allocations) : [];

  // Auction derived stats
  const filteredAuctions = auctionStatusFilter
    ? AUCTIONS.filter((a) => a.status === auctionStatusFilter)
    : AUCTIONS;
  const activeAuctions = AUCTIONS.filter((a) => a.status === 'ongoing' || a.status === 'pending').length;
  const completedAuctions = AUCTIONS.filter((a) => a.status === 'completed').length;
  const countriesTracked = new Set(AUCTIONS.map((a) => a.country)).size;

  // Determine whether the current tab is from the "allocations" group or "auctions" group
  const isAuctionTab = activeTab === 'auctions' || activeTab === 'freq-bands' || activeTab === 'regulatory' || activeTab === 'education' || activeTab === 'lawyers';

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4">
          <PageHeader
            title="Spectrum Management"
            subtitle="Satellite frequency allocations, filings, auctions, and spectrum coordination"
            breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Spectrum Management' }]}
          />
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || (!data.allocations.length && !data.filings.length)) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4">
          <PageHeader
            title="Spectrum Management"
            subtitle="Satellite frequency allocations, filings, auctions, and spectrum coordination"
            breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Spectrum Management' }]}
          />
          <div className="card p-12 text-center max-w-lg mx-auto">
            <div className="text-5xl mb-4">~</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Spectrum Data Available</h3>
            <p className="text-slate-400 mb-6">
              Load satellite frequency allocations, spectrum filings, and coordination data to get started.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="btn-primary"
            >
              {initializing ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Loading Data...
                </span>
              ) : (
                'Load Spectrum Data'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Spectrum Management"
          subtitle="Satellite frequency allocations, filings, auctions, and spectrum coordination"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Spectrum Management' }]}
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            Back to Dashboard
          </Link>
        </PageHeader>

        {/* Quick Stats -- show allocation stats or auction stats based on active section */}
        {!isAuctionTab ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-slate-900">
                {data.stats.totalBands}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Bands Tracked
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-blue-400">
                {data.stats.totalFilings}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Total Filings
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-green-400">
                {approvedFilings}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Approved Filings
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-yellow-400">
                {pendingFilings}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Pending Filings
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-blue-400">
                {activeAuctions}
              </div>
              <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">
                Active Auctions
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-green-400">
                $103.7B
              </div>
              <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">
                Total Value Traded
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-yellow-400">
                {completedAuctions}
              </div>
              <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">
                Completed Auctions
              </div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-purple-400">
                {countriesTracked}
              </div>
              <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">
                Countries Tracked
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {/* Divider label: Allocations & Filings */}
          <span className="text-xs text-slate-400 uppercase tracking-widest font-medium self-center pr-1 hidden md:inline">Tracker</span>
          {([
            { id: 'bands' as const, label: 'Band Allocations', count: data.allocations.length },
            { id: 'filings' as const, label: 'Active Filings', count: data.filings.length },
            { id: 'coordination' as const, label: 'Coordination' },
          ] as { id: TabId; label: string; count?: number }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-slate-900 shadow-glow-sm'
                  : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100/50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-slate-900'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px bg-slate-200 mx-1 self-stretch hidden md:block" />
          <span className="text-xs text-slate-400 uppercase tracking-widest font-medium self-center px-1 hidden md:inline">Auctions</span>

          {([
            { id: 'auctions' as const, label: 'Auctions', count: AUCTIONS.length },
            { id: 'freq-bands' as const, label: 'Frequency Bands', count: FREQUENCY_BANDS.length },
            { id: 'regulatory' as const, label: 'Regulatory Tracker', count: REGULATORY_PROCEEDINGS.length },
            { id: 'education' as const, label: 'How Auctions Work' },
            { id: 'lawyers' as const, label: 'For Lawyers' },
          ] as { id: TabId; label: string; count?: number }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-slate-900 shadow-glow-sm'
                  : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100/50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-slate-900'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ──────────────── BAND ALLOCATIONS TAB ──────────────── */}
        {activeTab === 'bands' && (
          <div>
            {/* Spectrum Overview Bar */}
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-900 font-semibold">Spectrum Overview</h3>
                <ExportButton
                  data={enrichedAllocations}
                  filename="spectrum-band-allocations"
                  columns={ALLOCATION_EXPORT_COLUMNS}
                  label="Export Allocations"
                />
              </div>
              <div className="flex rounded-lg overflow-hidden h-8 mb-4">
                {data.allocations.map((alloc) => {
                  const statusInfo = FILING_STATUS_INFO[alloc.filingStatus] || FILING_STATUS_INFO.available;
                  const widthPercent = (alloc.bandwidth / data.allocations.reduce((sum, a) => sum + a.bandwidth, 0)) * 100;
                  return (
                    <div
                      key={alloc.id}
                      className={`${statusInfo.bgColor} relative group cursor-default`}
                      style={{ width: `${Math.max(widthPercent, 3)}%`, opacity: 0.7 }}
                      title={`${alloc.bandName}: ${formatFrequency(alloc.frequencyMin)} - ${formatFrequency(alloc.frequencyMax)}`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-slate-900/80 truncate px-1">
                          {widthPercent > 8 ? alloc.bandName : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4">
                {Object.entries(FILING_STATUS_INFO).map(([key, info]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${info.bgColor}`} style={{ opacity: 0.7 }} />
                    <span className="text-slate-400">{info.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Band Cards */}
            <div className="space-y-4">
              {data.allocations.map((allocation) => (
                <BandAllocationRow key={allocation.id} allocation={allocation} />
              ))}
            </div>
          </div>
        )}

        {/* ──────────────── ACTIVE FILINGS TAB ──────────────── */}
        {activeTab === 'filings' && (
          <div>
            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-nebula-500/50"
                >
                  <option value="">All Statuses</option>
                  {OPERATOR_FILING_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                <select
                  value={bandFilter}
                  onChange={(e) => handleBandFilterChange(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-nebula-500/50"
                >
                  <option value="">All Bands</option>
                  {filingBands.map((band) => {
                    const bandInfo = SPECTRUM_BANDS.find((b) => b.value === band);
                    return (
                      <option key={band} value={band}>{bandInfo?.label || band}</option>
                    );
                  })}
                </select>

                {(statusFilter || bandFilter) && (
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}

                <span className="text-xs text-slate-400 ml-auto mr-3">
                  {filteredFilings.length} {filteredFilings.length === 1 ? 'filing' : 'filings'} found
                </span>

                <ExportButton
                  data={enrichedFilings}
                  filename="spectrum-filings"
                  columns={FILING_EXPORT_COLUMNS}
                  label="Export Filings"
                />
              </div>
            </div>

            {/* Filing Cards */}
            {filteredFilings.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">~</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No filings found</h3>
                <p className="text-slate-400 mb-4">
                  {(statusFilter || bandFilter)
                    ? 'Try adjusting your filters to see more results.'
                    : 'No spectrum filings are currently available.'}
                </p>
                {(statusFilter || bandFilter) && (
                  <button
                    onClick={handleClearFilters}
                    className="btn-secondary"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredFilings.map((filing) => (
                  <FilingCard key={filing.id} filing={filing} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──────────────── COORDINATION TAB ──────────────── */}
        {activeTab === 'coordination' && (
          <div className="space-y-6">
            {/* Coordination Overview */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Spectrum Coordination Process</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Satellite spectrum coordination is the process by which operators negotiate with existing
                spectrum users to minimize interference. This is required before any new satellite system
                can begin operations in a shared frequency band. The process involves regulatory filings,
                technical analyses, and bilateral agreements between operators.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: '1', title: 'Filing', desc: 'Operator submits spectrum request to national regulator (e.g., FCC) and ITU.' },
                  { step: '2', title: 'Publication', desc: 'ITU publishes the filing in the International Frequency Information Circular (BR IFIC).' },
                  { step: '3', title: 'Coordination', desc: 'Affected administrations and operators review and negotiate interference mitigation.' },
                  { step: '4', title: 'Registration', desc: 'Once coordinated, the assignment is recorded in the Master International Frequency Register.' },
                ].map((item) => (
                  <div key={item.step} className="card p-4 text-center">
                    <div className="w-8 h-8 rounded-full bg-nebula-500/20 text-nebula-300 font-bold text-sm flex items-center justify-center mx-auto mb-3">
                      {item.step}
                    </div>
                    <h4 className="text-slate-900 font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Regulatory Bodies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ITU */}
              <div className="card-elevated p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                    ITU
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-semibold">International Telecommunication Union</h4>
                    <p className="text-slate-400 text-sm">United Nations specialized agency</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  The ITU is the global body responsible for coordinating the shared use of radio spectrum.
                  The Radiocommunication Sector (ITU-R) manages the Radio Regulations, which govern
                  international spectrum use for all satellite and terrestrial services.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Coordination Framework</span>
                    <span className="text-slate-900">Radio Regulations (RR)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Filing Database</span>
                    <span className="text-slate-900">Space Network Systems (SNS)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Key Conference</span>
                    <span className="text-slate-900">World Radiocommunication Conference (WRC)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Regions</span>
                    <span className="text-slate-900">Region 1, 2, 3 (Global)</span>
                  </div>
                </div>
                {/* Cross-module link to compliance */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <Link
                    href="/compliance?tab=regulations"
                    className="inline-flex items-center gap-1.5 text-xs text-nebula-300 hover:text-nebula-200 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    View ITU regulations in Compliance module
                  </Link>
                </div>
              </div>

              {/* FCC */}
              <div className="card-elevated p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                    FCC
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-semibold">Federal Communications Commission</h4>
                    <p className="text-slate-400 text-sm">United States regulator</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  The FCC regulates satellite communications in the United States through its
                  International Bureau and Space Bureau. It processes satellite applications,
                  manages spectrum auctions, and enforces compliance with license conditions.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Satellite Bureau</span>
                    <span className="text-slate-900">Space Bureau (est. 2023)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Filing System</span>
                    <span className="text-slate-900">IBFS / MyIBFS</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Key Dockets</span>
                    <span className="text-slate-900">NGSO FSS, MSS, C-band transition</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Jurisdiction</span>
                    <span className="text-slate-900">United States (ITU Region 2)</span>
                  </div>
                </div>
                {/* Cross-module link to compliance */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <Link
                    href="/compliance?tab=regulations"
                    className="inline-flex items-center gap-1.5 text-xs text-nebula-300 hover:text-nebula-200 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    View FCC regulations in Compliance module
                  </Link>
                </div>
              </div>
            </div>

            {/* Coordination Requirements Table */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Bands Requiring Coordination</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Band</th>
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Range</th>
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Service</th>
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Status</th>
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Filings</th>
                      <th className="text-left text-slate-400 text-xs uppercase tracking-widest font-medium py-3">References</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.allocations
                      .filter((a) => a.coordinationRequired)
                      .map((alloc) => {
                        const statusInfo = FILING_STATUS_INFO[alloc.filingStatus] || FILING_STATUS_INFO.available;
                        return (
                          <tr key={alloc.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-3 pr-4 text-slate-900 font-medium">{alloc.bandName}</td>
                            <td className="py-3 pr-4 text-slate-400">
                              {formatFrequency(alloc.frequencyMin)} - {formatFrequency(alloc.frequencyMax)}
                            </td>
                            <td className="py-3 pr-4 text-slate-400">{SERVICE_LABELS[alloc.service] || alloc.service}</td>
                            <td className="py-3 pr-4">
                              <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                            </td>
                            <td className="py-3 pr-4 text-slate-400">{alloc.numberOfFilings}</td>
                            <td className="py-3 text-slate-400 font-mono text-xs">
                              {[alloc.ituReference, alloc.fccReference].filter(Boolean).join(', ') || '--'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional Context */}
            <div className="card p-6 border-dashed">
              <h3 className="text-slate-900 font-semibold mb-3">Key Considerations</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-nebula-300 text-sm font-medium mb-2">NGSO/GSO Sharing</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Non-geostationary (NGSO) constellations like Starlink and Kuiper must demonstrate
                    that they will not cause harmful interference to existing geostationary (GSO) satellite
                    operators through equivalent power flux density (EPFD) limits set by ITU Article 22.
                  </p>
                </div>
                <div>
                  <h4 className="text-nebula-300 text-sm font-medium mb-2">Milestone Requirements</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    The FCC requires NGSO licensees to deploy a portion of their constellation within specific
                    timeframes. Failure to meet deployment milestones can result in license modification or
                    revocation. The ITU also has bring-into-use deadlines for filed satellite networks.
                  </p>
                </div>
                <div>
                  <h4 className="text-nebula-300 text-sm font-medium mb-2">Spectrum Auctions</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Some bands, particularly C-band (3.7-3.98 GHz), have undergone spectrum auctions
                    to reallocate frequencies from satellite to terrestrial 5G use. This process involves
                    clearing incumbent satellite operators and providing relocation compensation.
                  </p>
                </div>
              </div>
            </div>

            {/* Cross-module links for coordination resources */}
            <div className="card p-5 border border-nebula-500/20">
              <h3 className="text-slate-900 font-semibold mb-3">Related Resources</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/compliance?tab=regulations"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  FCC/ITU Regulations
                </Link>
                <Link
                  href="/orbital-slots?tab=operators"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  Orbital Slot Operators
                </Link>
                <Link
                  href="/compliance"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Compliance Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ AUCTIONS TAB ═══════════════════ */}
        {activeTab === 'auctions' && (
          <div>
            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-star-300 text-sm">Filter by status:</span>
                {['', 'completed', 'ongoing', 'pending', 'policy'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setAuctionStatusFilter(status)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      auctionStatusFilter === status
                        ? 'bg-nebula-500/30 text-nebula-300'
                        : 'bg-white/5 text-star-300 hover:bg-white/10'
                    }`}
                  >
                    {status === '' ? 'All' : AUCTION_STATUS_STYLES[status as AuctionStatus].label}
                  </button>
                ))}
                <span className="text-xs text-star-300 ml-auto">
                  {filteredAuctions.length} {filteredAuctions.length === 1 ? 'auction' : 'auctions'}
                </span>
              </div>
            </div>

            {/* Auction Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAuctions.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>

            {filteredAuctions.length === 0 && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4 text-star-300">~</div>
                <h3 className="text-xl font-semibold text-white mb-2">No auctions match filter</h3>
                <p className="text-star-300 mb-4">Try a different status filter.</p>
                <button
                  onClick={() => setAuctionStatusFilter('')}
                  className="btn-secondary"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ FREQUENCY BANDS TAB ═══════════════════ */}
        {activeTab === 'freq-bands' && (
          <div className="space-y-4">
            <div className="card p-5 mb-2">
              <h3 className="text-white font-semibold mb-2">Key Frequency Bands for Space Communications</h3>
              <p className="text-star-300 text-sm leading-relaxed">
                Satellite and space communications rely on specific frequency bands allocated by the ITU.
                Each band has unique propagation characteristics, capacity, and regulatory status. Understanding
                these bands is essential for tracking auctions and spectrum policy decisions.
              </p>
            </div>

            {/* Band Cards */}
            {FREQUENCY_BANDS.map((band) => {
              const cong = CONGESTION_STYLES[band.congestion];
              return (
                <div key={band.band} className="card p-5 hover:border-nebula-500/50 transition-all">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div>
                      <h4 className="font-semibold text-white text-base">{band.band}</h4>
                      <span className="text-star-300 text-sm font-mono">{band.range}</span>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${cong.bg} ${cong.text}`}>
                      {cong.label} Congestion
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-star-300 text-xs block mb-0.5">Services</span>
                      <span className="text-white text-sm">{band.services}</span>
                    </div>
                    <div>
                      <span className="text-star-300 text-xs block mb-0.5">Space Relevance</span>
                      <span className="text-nebula-300 text-sm">{band.spaceRelevance}</span>
                    </div>
                  </div>

                  {/* Congestion bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-star-300 text-xs">Spectrum Congestion</span>
                      <span className={`text-xs font-medium ${cong.text}`}>{cong.percent}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${cong.barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${cong.percent}%`, opacity: 0.8 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Reference table */}
            <div className="card p-6 mt-4">
              <h3 className="text-white font-semibold mb-4">Band Allocation Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-star-300 text-xs uppercase tracking-widest font-medium py-3 pr-4">Band</th>
                      <th className="text-left text-star-300 text-xs uppercase tracking-widest font-medium py-3 pr-4">Range</th>
                      <th className="text-left text-star-300 text-xs uppercase tracking-widest font-medium py-3 pr-4">Primary Services</th>
                      <th className="text-left text-star-300 text-xs uppercase tracking-widest font-medium py-3">Congestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FREQUENCY_BANDS.map((band) => {
                      const cong = CONGESTION_STYLES[band.congestion];
                      return (
                        <tr key={band.band} className="border-b border-white/5 last:border-0">
                          <td className="py-3 pr-4 text-white font-medium">{band.band}</td>
                          <td className="py-3 pr-4 text-star-300 font-mono text-xs">{band.range}</td>
                          <td className="py-3 pr-4 text-star-300">{band.services}</td>
                          <td className="py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${cong.bg} ${cong.text}`}>
                              {cong.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ REGULATORY TRACKER TAB ═══════════════════ */}
        {activeTab === 'regulatory' && (
          <div className="space-y-4">
            <div className="card p-5 mb-2">
              <h3 className="text-white font-semibold mb-2">Active Regulatory Proceedings</h3>
              <p className="text-star-300 text-sm leading-relaxed">
                Key regulatory proceedings from the FCC, ITU, and other bodies that affect satellite spectrum rights
                and operations. Proceedings are ranked by potential impact on the satellite industry.
              </p>
            </div>

            {REGULATORY_PROCEEDINGS.map((proc) => {
              const impact = IMPACT_STYLES[proc.impact];
              return (
                <div key={proc.id} className="card p-5 hover:border-nebula-500/50 transition-all">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-nebula-300 shrink-0">
                        {proc.body}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-base">{proc.title}</h4>
                        <span className="text-star-300 text-sm font-mono">{proc.docket}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded ${impact.bg} ${impact.text}`}>
                        {proc.impact.charAt(0).toUpperCase() + proc.impact.slice(1)} Impact
                      </span>
                    </div>
                  </div>

                  <p className="text-star-300 text-sm leading-relaxed mb-3">{proc.description}</p>

                  <div className="flex items-center gap-4 text-xs text-star-300 pt-3 border-t border-white/10">
                    <span>Status: <span className="text-white font-medium">{proc.status}</span></span>
                    <span className="text-white/20">|</span>
                    <span>Timeline: <span className="text-white font-medium">{proc.date}</span></span>
                  </div>
                </div>
              );
            })}

            {/* Cross-module links */}
            <div className="card p-5 border border-nebula-500/20">
              <h3 className="text-white font-semibold mb-3">Related Resources</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/compliance?tab=regulations"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Compliance Dashboard
                </Link>
                <Link
                  href="/orbital-slots?tab=operators"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  Orbital Slot Operators
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ EDUCATION TAB ═══════════════════ */}
        {activeTab === 'education' && (
          <div className="space-y-6">
            {/* FCC Auction Process */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">FCC Auction Process</h3>
              <p className="text-star-300 text-sm leading-relaxed mb-5">
                The Federal Communications Commission uses competitive bidding (auctions) to assign licenses
                for commercial use of the electromagnetic spectrum. This process was authorized by Congress
                in 1993 and has since generated over $230 billion in revenue.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  {
                    step: '1',
                    title: 'Pre-Auction',
                    desc: 'FCC issues a public notice defining the spectrum to be auctioned, service rules, and license areas. Prospective bidders file applications and submit upfront payments.',
                  },
                  {
                    step: '2',
                    title: 'Bidding Rounds',
                    desc: 'Multiple rounds of simultaneous ascending bids occur. Bidders place bids on licenses across geographic areas. Activity rules ensure genuine participation.',
                  },
                  {
                    step: '3',
                    title: 'License Grant',
                    desc: 'Winning bidders make final payments and receive licenses. Licenses include buildout requirements and technical conditions for interference protection.',
                  },
                  {
                    step: '4',
                    title: 'Post-Auction',
                    desc: 'Licensees deploy infrastructure within mandated timelines. The FCC monitors compliance and can revoke licenses for failure to meet build-out milestones.',
                  },
                ].map((item) => (
                  <div key={item.step} className="card p-4 text-center">
                    <div className="w-8 h-8 rounded-full bg-nebula-500/20 text-nebula-300 font-bold text-sm flex items-center justify-center mx-auto mb-3">
                      {item.step}
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-star-300 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ITU WRC Cycle */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">ITU World Radiocommunication Conference (WRC) Cycle</h3>
              <p className="text-star-300 text-sm leading-relaxed mb-5">
                The WRC is held every 3-4 years by the International Telecommunication Union to review and revise
                the Radio Regulations, the international treaty governing the use of radio-frequency spectrum and
                satellite orbits. WRC decisions are binding on all 193 ITU member states.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Agenda Setting',
                    desc: 'The previous WRC establishes the agenda for the next conference. Study groups and regional bodies conduct technical studies over the 3-4 year inter-conference period.',
                    icon: 'A',
                  },
                  {
                    title: 'Conference',
                    desc: 'Delegates from member states negotiate and adopt changes to the Radio Regulations. Decisions include new allocations, sharing frameworks, and regulatory procedures.',
                    icon: 'C',
                  },
                  {
                    title: 'Implementation',
                    desc: 'National administrations implement WRC decisions into domestic regulations. The ITU Radiocommunication Bureau updates the Master Register and coordination procedures.',
                    icon: 'I',
                  },
                ].map((item) => (
                  <div key={item.title} className="card p-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-bold text-sm flex items-center justify-center mb-3">
                      {item.icon}
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-star-300 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Spectrum Types */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Licensed vs. Unlicensed vs. Shared Spectrum</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-5 border-green-500/30">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm mb-3">
                    L
                  </div>
                  <h4 className="text-white font-semibold mb-2">Licensed Spectrum</h4>
                  <p className="text-star-300 text-sm leading-relaxed">
                    Exclusive rights to use specific frequencies in defined geographic areas. Obtained through
                    auctions or administrative assignment. Provides interference protection and regulatory certainty.
                    Most satellite bands are licensed.
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-star-300 text-xs">Examples: </span>
                    <span className="text-white text-xs">C-band satellite, Ku-band DTH, Ka-band HTS</span>
                  </div>
                </div>

                <div className="card p-5 border-blue-500/30">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm mb-3">
                    U
                  </div>
                  <h4 className="text-white font-semibold mb-2">Unlicensed Spectrum</h4>
                  <p className="text-star-300 text-sm leading-relaxed">
                    Shared spectrum available to anyone meeting technical requirements. No exclusive rights or
                    interference protection. Devices must accept interference from other users. Low barriers to
                    entry but limited quality-of-service guarantees.
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-star-300 text-xs">Examples: </span>
                    <span className="text-white text-xs">Wi-Fi (2.4/5/6 GHz), Bluetooth, ISM bands</span>
                  </div>
                </div>

                <div className="card p-5 border-yellow-500/30">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-sm mb-3">
                    S
                  </div>
                  <h4 className="text-white font-semibold mb-2">Shared Spectrum</h4>
                  <p className="text-star-300 text-sm leading-relaxed">
                    Spectrum shared between multiple services under defined rules. Priority tiers determine
                    access rights. Dynamic spectrum access (DSA) and spectrum access systems (SAS)
                    manage interference in real time. Increasingly common model.
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-star-300 text-xs">Examples: </span>
                    <span className="text-white text-xs">CBRS (3.5 GHz), 12 GHz NGSO/terrestrial, C-band transition</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary vs Secondary */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Primary vs. Secondary Allocation Status</h3>
              <p className="text-star-300 text-sm leading-relaxed mb-5">
                The ITU Radio Regulations define two levels of allocation status for radio services in each
                frequency band. This hierarchy determines interference rights and protection obligations.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-elevated p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <h4 className="text-white font-semibold">Primary Allocation</h4>
                  </div>
                  <ul className="space-y-2 text-star-300 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 shrink-0">--</span>
                      <span>Full interference protection from secondary services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 shrink-0">--</span>
                      <span>Must coordinate with other primary services in the same band</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 shrink-0">--</span>
                      <span>Recorded in the Table of Frequency Allocations in UPPERCASE</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1 shrink-0">--</span>
                      <span>Example: FIXED-SATELLITE in Ku-band (primary)</span>
                    </li>
                  </ul>
                </div>

                <div className="card-elevated p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <h4 className="text-white font-semibold">Secondary Allocation</h4>
                  </div>
                  <ul className="space-y-2 text-star-300 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1 shrink-0">--</span>
                      <span>Must not cause harmful interference to primary services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1 shrink-0">--</span>
                      <span>Cannot claim protection from interference by primary services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1 shrink-0">--</span>
                      <span>Recorded in the Table of Frequency Allocations in lowercase</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1 shrink-0">--</span>
                      <span>Example: radiolocation in S-band (secondary)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════ FOR LAWYERS TAB ═══════════════════ */}
        {activeTab === 'lawyers' && (
          <div className="space-y-6">
            <div className="card p-6 border border-nebula-500/20">
              <h3 className="text-lg font-semibold text-white mb-2">Impact Analysis: Spectrum Auctions & Satellite Operator Rights</h3>
              <p className="text-star-300 text-sm leading-relaxed">
                This section analyzes how spectrum auction outcomes and regulatory proceedings affect the rights,
                operations, and business models of existing satellite operators. Key legal and commercial impacts
                are assessed for each major proceeding.
              </p>
            </div>

            {/* C-Band Transition Impact */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-xs shrink-0">
                  C
                </div>
                <div>
                  <h4 className="text-white font-semibold">C-Band Reallocation (3.7-3.98 GHz)</h4>
                  <span className="text-xs text-red-400 font-medium">High Impact on Incumbent Operators</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Legal Framework</h5>
                  <p className="text-star-300 text-sm leading-relaxed">
                    FCC Order 20-22 mandated the clearing of 280 MHz of C-band spectrum from satellite downlink use.
                    Incumbent satellite operators (SES, Intelsat, Eutelsat) received accelerated relocation payments
                    totaling approximately $9.7 billion to transition services to the upper C-band (4.0-4.2 GHz) and
                    alternative bands.
                  </p>
                </div>
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Impact on Existing Rights</h5>
                  <ul className="space-y-1 text-star-300 text-sm">
                    <li>-- Loss of primary allocation in 3.7-3.98 GHz for satellite downlinks in the US</li>
                    <li>-- Required migration of thousands of earth stations to alternative frequencies</li>
                    <li>-- Compressed available spectrum for C-band satellite services from 500 MHz to 200 MHz</li>
                    <li>-- Precedent for future satellite-to-terrestrial spectrum reallocation globally</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Key Legal Considerations</h5>
                  <ul className="space-y-1 text-star-300 text-sm">
                    <li>-- Relocation compensation adequacy and timeline disputes</li>
                    <li>-- Interference protection for remaining C-band satellite operations</li>
                    <li>-- International coordination obligations under ITU Radio Regulations</li>
                    <li>-- Impact on long-term satellite service contracts and capacity commitments</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 12 GHz Band */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-xs shrink-0">
                  12G
                </div>
                <div>
                  <h4 className="text-white font-semibold">12 GHz Band Sharing (12.2-12.7 GHz)</h4>
                  <span className="text-xs text-yellow-400 font-medium">Contested -- Active Rulemaking</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Dispute Summary</h5>
                  <p className="text-star-300 text-sm leading-relaxed">
                    The MVDDS Coalition (led by RS Access) petitioned the FCC to allow two-way terrestrial
                    broadband in the 12 GHz band, which is currently used by NGSO satellite systems (primarily
                    Starlink) for downlinks. SpaceX and DISH Network (DBS) argue that terrestrial use would cause
                    harmful interference to millions of satellite terminals.
                  </p>
                </div>
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Legal Stakes</h5>
                  <ul className="space-y-1 text-star-300 text-sm">
                    <li>-- Starlink relies on 12 GHz for approximately 75% of its downlink capacity</li>
                    <li>-- Existing MVDDS licenses are secondary to satellite services</li>
                    <li>-- Proposed elevation to co-primary status would fundamentally alter sharing dynamics</li>
                    <li>-- Technical studies from both sides present conflicting interference conclusions</li>
                    <li>-- Potential for significant reduction in NGSO satellite throughput if terrestrial use is authorized</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* NGSO/GSO Sharing */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                  N/G
                </div>
                <div>
                  <h4 className="text-white font-semibold">NGSO/GSO Spectrum Sharing (ITU Article 22)</h4>
                  <span className="text-xs text-blue-400 font-medium">Ongoing International Framework</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Framework Overview</h5>
                  <p className="text-star-300 text-sm leading-relaxed">
                    ITU Article 22 establishes EPFD (equivalent power flux density) limits that NGSO systems must
                    meet to protect GSO systems from aggregate interference. As mega-constellations like Starlink
                    (12,000+ satellites) and Kuiper (3,236 satellites) deploy, the adequacy of existing EPFD limits
                    is being challenged.
                  </p>
                </div>
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Legal Implications</h5>
                  <ul className="space-y-1 text-star-300 text-sm">
                    <li>-- GSO operators (SES, Intelsat, Eutelsat) argue EPFD limits are too lenient for mega-constellations</li>
                    <li>-- NGSO operators argue existing limits are technically sound and commercially necessary</li>
                    <li>-- WRC-23 initiated review studies; WRC-27 may revise Article 22 limits</li>
                    <li>-- Potential for operational constraints on NGSO systems if limits are tightened</li>
                    <li>-- Coordination obligation complexities for systems with thousands of satellites</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* D2D Satellite Spectrum */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">
                  D2D
                </div>
                <div>
                  <h4 className="text-white font-semibold">Direct-to-Device (D2D) Satellite Spectrum</h4>
                  <span className="text-xs text-purple-400 font-medium">Emerging Regulatory Area</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Regulatory Landscape</h5>
                  <p className="text-star-300 text-sm leading-relaxed">
                    Direct-to-device satellite services (e.g., SpaceX/T-Mobile, AST SpaceMobile) use terrestrial
                    mobile spectrum from space, creating a new category of spectrum sharing. National regulators are
                    developing frameworks for this hybrid use, with significant implications for existing spectrum
                    rights holders.
                  </p>
                </div>
                <div>
                  <h5 className="text-nebula-300 text-sm font-medium mb-1">Key Issues</h5>
                  <ul className="space-y-1 text-star-300 text-sm">
                    <li>-- Whether MNO spectrum licenses extend to satellite-based transmission</li>
                    <li>-- Cross-border interference concerns from satellite beams covering multiple countries</li>
                    <li>-- India auction vs. administrative assignment debate for satellite spectrum</li>
                    <li>-- Compatibility between D2D satellite and terrestrial mobile in the same bands</li>
                    <li>-- ITU WRC-27 agenda item on supplemental satellite component (SSC) allocations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Related Resources */}
            <div className="card p-5 border border-nebula-500/20">
              <h3 className="text-white font-semibold mb-3">Legal Research Resources</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/compliance?tab=regulations"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  FCC/ITU Regulations
                </Link>
                <Link
                  href="/space-insurance"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Space Insurance
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Status Legend Footer */}
        <div className="card p-4 mt-8 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {!isAuctionTab ? (
              <>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(FILING_STATUS_INFO).map(([key, info]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${info.bgColor}`} />
                      <span className="text-slate-400">{info.label}</span>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-slate-400">
                  {data.stats.totalBands} bands | {data.stats.totalFilings} total filings | {data.stats.congestedBands} congested
                </span>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(AUCTION_STATUS_STYLES).map(([key, style]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${style.bg.replace('/20', '')}`} />
                      <span className="text-star-300">{style.label}</span>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-star-300">
                  {AUCTIONS.length} auctions | {FREQUENCY_BANDS.length} bands | {REGULATORY_PROCEEDINGS.length} proceedings
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page (with Suspense boundary)
// ────────────────────────────────────────

export default function SpectrumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <div className="container mx-auto px-4">
            <PageHeader
              title="Spectrum Management"
              subtitle="Satellite frequency allocations, filings, auctions, and spectrum coordination"
              breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Spectrum Management' }]}
            />
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </div>
      }
    >
      <SpectrumContent />
    </Suspense>
  );
}
