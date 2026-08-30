/**
 * Shared, server-safe types and helpers for the company directory.
 *
 * This module deliberately carries NO 'use client' directive and no JSX so it
 * can be imported from the server page (`page.tsx`), the client island
 * (`CompanyProfilesClient.tsx`) and the table wrapper alike.
 */

export interface CompanyCard {
  id: string;
  slug: string;
  name: string;
  ticker: string | null;
  exchange: string | null;
  headquarters: string | null;
  country: string | null;
  foundedYear: number | null;
  employeeRange: string | null;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  isPublic: boolean;
  marketCap: number | null;
  status: string;
  sector: string | null;
  subsector: string | null;
  tags: string[];
  tier: number;
  sponsorTier: string | null;
  sponsorTagline: string | null;
  totalFunding: number | null;
  lastFundingRound: string | null;
  valuation: number | null;
  revenueEstimate: number | null;
  ownershipType: string | null;
  dataCompleteness: number;
  _count: {
    fundingRounds: number;
    products: number;
    keyPersonnel: number;
    contracts: number;
    events: number;
    satelliteAssets: number;
    facilities: number;
    jobPostings: number;
  };
}

export interface DirectoryStats {
  totalCompanies: number;
  totalFundingTracked: number;
  totalMarketCap: number;
  /**
   * Kept on the wire because `/api/company-profiles` returns it, but NEVER
   * rendered: `dataCompleteness` is an internal data-quality metric and
   * showing it as intelligence is SYNTHESIS.md item 29's "61% Avg
   * Completeness" tile, which is retired.
   */
  avgCompleteness: number;
  sectors: { sector: string | null; count: number }[];
}

/** Page size shared by the server first screen and the client's load-more. */
export const DIRECTORY_PAGE_SIZE = 24;

/** The default query the server pre-renders. The client must match it exactly. */
export const DEFAULT_SORT_BY = 'tier';
export const DEFAULT_SORT_ORDER = 'asc';

export const SECTOR_OPTIONS = [
  { value: '', label: 'All Sectors' },
  { value: 'launch', label: 'Launch Providers' },
  { value: 'satellite', label: 'Satellite Operators' },
  { value: 'defense', label: 'Defense & National Security' },
  { value: 'infrastructure', label: 'Infrastructure & Services' },
  { value: 'ground-segment', label: 'Ground Segment' },
  { value: 'manufacturing', label: 'Components & Manufacturing' },
  { value: 'analytics', label: 'Analytics & Software' },
  { value: 'agency', label: 'Space Agencies' },
  { value: 'exploration', label: 'Exploration & Science' },
];

export const TIER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  { value: '1', label: 'Tier 1 — Must Have' },
  { value: '2', label: 'Tier 2 — High Growth' },
  { value: '3', label: 'Tier 3 — Emerging' },
];

export const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'acquired', label: 'Acquired' },
  { value: 'pre-revenue', label: 'Pre-Revenue' },
  { value: 'defunct', label: 'Defunct' },
];

export function formatMoney(value: number | null | undefined, compact = true): string {
  if (!value) return '—';
  if (compact) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function getSectorIcon(sector: string | null): string {
  const map: Record<string, string> = {
    launch: '🚀', satellite: '🛰️', defense: '🛡️', infrastructure: '🏗️',
    'ground-segment': '📡', manufacturing: '⚙️', analytics: '📊',
    agency: '🏛️', exploration: '🔭', services: '🔧',
  };
  return map[sector || ''] || '🏢';
}

const SECTOR_LABELS = new Map(SECTOR_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]));

/** Human label for a raw sector slug; falls back to the slug itself. */
export function sectorLabel(sector: string | null): string {
  if (!sector) return '—';
  return SECTOR_LABELS.get(sector) ?? sector;
}
