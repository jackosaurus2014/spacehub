'use client';

import { useState, useMemo, useCallback } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import RelatedModules from '@/components/ui/RelatedModules';

// ════════════════════════════════════════
// Types
// ════════════════════════════════════════

type Agency = 'FCC' | 'FAA' | 'NOAA' | 'DoC' | 'DoD' | 'Congress' | 'International';
type ImpactLevel = 'High' | 'Medium' | 'Low';
type Sector = 'Launch' | 'Satellite' | 'Spectrum' | 'Remote Sensing' | 'Human Spaceflight' | 'Defense' | 'Export Control' | 'Space Sustainability';
type ProceedingStatus = 'Active' | 'Comment Period' | 'Under Review' | 'Proposed' | 'Final Rule Pending' | 'Enacted' | 'In Committee';
type SortField = 'date' | 'impact' | 'agency' | 'title';
type ViewMode = 'table' | 'cards' | 'timeline';

interface RegulatoryProceeding {
  id: string;
  title: string;
  agency: Agency;
  status: ProceedingStatus;
  expectedDate: string;
  impact: ImpactLevel;
  sectors: Sector[];
  docketNumber?: string;
  summary: string;
  lastUpdated: string;
  commentDeadline?: string;
  url?: string;
}

// ════════════════════════════════════════
// Regulatory Proceedings Data (22 items)
// ════════════════════════════════════════

const PROCEEDINGS: RegulatoryProceeding[] = [
  {
    id: 'fcc-deorbit-5yr',
    title: 'FCC 5-Year Deorbit Rule Implementation',
    agency: 'FCC',
    status: 'Final Rule Pending',
    expectedDate: '2026-06-30',
    impact: 'High',
    sectors: ['Satellite', 'Space Sustainability'],
    docketNumber: 'IB Docket No. 22-271',
    summary: 'Finalizes the rule requiring LEO satellite operators to deorbit spacecraft within 5 years of end-of-mission, down from the previous 25-year guideline. Applies to all new FCC-authorized satellites and non-US satellites seeking US market access.',
    lastUpdated: '2026-02-15',
    commentDeadline: '2026-03-15',
    url: 'https://www.fcc.gov/document/fcc-adopts-new-5-year-rule-deorbiting-satellites',
  },
  {
    id: 'faa-part450-reform',
    title: 'FAA Part 450 Launch License Reform',
    agency: 'FAA',
    status: 'Active',
    expectedDate: '2026-09-01',
    impact: 'High',
    sectors: ['Launch', 'Human Spaceflight'],
    docketNumber: '14 CFR Part 450',
    summary: 'Comprehensive overhaul of commercial launch licensing rules under Part 450, moving from prescriptive requirements to performance-based regulations. Streamlines the licensing process for reusable launch vehicles and high-cadence operations.',
    lastUpdated: '2026-02-10',
    url: 'https://www.faa.gov/space/streamlined_licensing',
  },
  {
    id: 'fcc-ngso-spectrum',
    title: 'FCC NGSO Spectrum Sharing Framework',
    agency: 'FCC',
    status: 'Comment Period',
    expectedDate: '2026-12-01',
    impact: 'High',
    sectors: ['Spectrum', 'Satellite'],
    docketNumber: 'IB Docket No. 20-330',
    summary: 'Establishes interference management and spectrum sharing rules for non-geostationary satellite orbit (NGSO) systems operating in the Ku/Ka-band. Addresses coordination between mega-constellation operators like SpaceX Starlink, Amazon Kuiper, and OneWeb.',
    lastUpdated: '2026-02-20',
    commentDeadline: '2026-04-30',
  },
  {
    id: 'congress-space-act',
    title: 'Congressional SPACE Act Reauthorization',
    agency: 'Congress',
    status: 'In Committee',
    expectedDate: '2026-11-01',
    impact: 'High',
    sectors: ['Launch', 'Satellite', 'Human Spaceflight'],
    docketNumber: 'H.R. 4521',
    summary: 'Reauthorization and update of the Commercial Space Launch Competitiveness Act. Proposes extending the learning period moratorium on human spaceflight regulations, clarifying space resource rights, and establishing a framework for on-orbit servicing.',
    lastUpdated: '2026-02-01',
  },
  {
    id: 'noaa-remote-sensing',
    title: 'NOAA Commercial Remote Sensing Licensing Reform',
    agency: 'NOAA',
    status: 'Active',
    expectedDate: '2026-08-15',
    impact: 'High',
    sectors: ['Remote Sensing', 'Satellite'],
    docketNumber: '15 CFR Part 960',
    summary: 'Modernization of commercial remote sensing licensing under Part 960. Introduces tiered licensing based on system capabilities, reduces processing times, and clarifies restrictions on synthetic aperture radar (SAR) and hyperspectral imagery distribution.',
    lastUpdated: '2026-02-18',
  },
  {
    id: 'faa-human-spaceflight',
    title: 'FAA Human Spaceflight Regulations Update',
    agency: 'FAA',
    status: 'Proposed',
    expectedDate: '2027-03-01',
    impact: 'High',
    sectors: ['Human Spaceflight', 'Launch'],
    docketNumber: 'FAA-2025-1847',
    summary: 'Proposed rulemaking on crew and spaceflight participant safety requirements, including cabin environment standards, emergency systems, and training requirements. Considers transition from the current informed consent model to prescriptive safety regulations.',
    lastUpdated: '2026-01-28',
    commentDeadline: '2026-06-30',
  },
  {
    id: 'fcc-d2d-spectrum',
    title: 'FCC Direct-to-Device Spectrum Sharing Framework',
    agency: 'FCC',
    status: 'Active',
    expectedDate: '2026-10-01',
    impact: 'High',
    sectors: ['Spectrum', 'Satellite'],
    docketNumber: 'GN Docket No. 23-65',
    summary: 'Framework for satellite direct-to-cellular-device (D2D) services, including spectrum sharing between satellite operators and terrestrial mobile carriers. Addresses interference management for services like T-Mobile/SpaceX, AST SpaceMobile, and Lynk Global.',
    lastUpdated: '2026-02-22',
    commentDeadline: '2026-05-15',
  },
  {
    id: 'doc-itar-reform',
    title: 'DoC Export Control Modernization (ITAR Reform)',
    agency: 'DoC',
    status: 'Under Review',
    expectedDate: '2026-07-01',
    impact: 'High',
    sectors: ['Export Control', 'Satellite', 'Launch'],
    docketNumber: 'BIS-2025-0018',
    summary: 'Comprehensive review of USML Categories IV and XV (launch vehicles and satellites) for potential transfer to the Commerce Control List (CCL). Aims to reduce export licensing burden for commercial space hardware while maintaining national security controls.',
    lastUpdated: '2026-02-05',
  },
  {
    id: 'faa-env-review',
    title: 'FAA Launch Site Environmental Review Modernization',
    agency: 'FAA',
    status: 'Active',
    expectedDate: '2026-12-31',
    impact: 'Medium',
    sectors: ['Launch'],
    docketNumber: 'FAA-2025-2103',
    summary: 'Updates to FAA environmental review processes for commercial launch sites under NEPA. Proposes programmatic EIS for high-cadence launch operations and categorical exclusions for certain reusable vehicle operations at established spaceports.',
    lastUpdated: '2026-02-12',
  },
  {
    id: 'fcc-spectrum-auction',
    title: 'FCC Spectrum Auction Schedule (AWS-3, CBRS)',
    agency: 'FCC',
    status: 'Proposed',
    expectedDate: '2026-09-15',
    impact: 'Medium',
    sectors: ['Spectrum'],
    docketNumber: 'AU Docket No. 25-112',
    summary: 'Upcoming spectrum auctions impacting satellite services, including AWS-3 band allocations and CBRS expansion. Includes provisions for protecting satellite downlink operations and establishing coordination zones around earth stations.',
    lastUpdated: '2026-01-30',
  },
  {
    id: 'congress-nasa-auth',
    title: 'Congressional NASA Authorization Act',
    agency: 'Congress',
    status: 'In Committee',
    expectedDate: '2026-12-01',
    impact: 'High',
    sectors: ['Launch', 'Human Spaceflight', 'Satellite'],
    docketNumber: 'S. 2847',
    summary: 'Multi-year NASA authorization bill covering Artemis program funding, Commercial LEO Destinations program continuation, Mars mission architecture, and commercial cargo/crew transportation services. Includes provisions for CLPS lunar delivery services.',
    lastUpdated: '2026-02-08',
  },
  {
    id: 'fcc-mvdds-ku',
    title: 'FCC MVDDS/Ku-Band Spectrum Sharing Rules',
    agency: 'FCC',
    status: 'Comment Period',
    expectedDate: '2026-08-01',
    impact: 'Medium',
    sectors: ['Spectrum', 'Satellite'],
    docketNumber: 'RM-11768',
    summary: 'Rulemaking on shared use of 12.2-12.7 GHz band between MVDDS terrestrial services and NGSO satellite downlinks. Evaluates interference potential and proposes power limits and geographic restrictions for coexistence.',
    lastUpdated: '2026-02-14',
    commentDeadline: '2026-04-01',
  },
  {
    id: 'faa-reentry-licensing',
    title: 'FAA Reentry Vehicle Licensing Framework',
    agency: 'FAA',
    status: 'Proposed',
    expectedDate: '2027-01-15',
    impact: 'Medium',
    sectors: ['Launch', 'Human Spaceflight'],
    docketNumber: 'FAA-2026-0234',
    summary: 'New licensing framework for commercial reentry vehicles, including uncrewed cargo vehicles, sample return capsules, and space tourism vehicles. Addresses landing site requirements, trajectory safety analysis, and integration with national airspace.',
    lastUpdated: '2026-02-19',
    commentDeadline: '2026-07-15',
  },
  {
    id: 'noaa-weather-data',
    title: 'NOAA Weather Data Commercial Distribution Policy',
    agency: 'NOAA',
    status: 'Under Review',
    expectedDate: '2026-06-01',
    impact: 'Low',
    sectors: ['Remote Sensing', 'Satellite'],
    docketNumber: 'NOAA-2025-0098',
    summary: 'Review of policies governing commercial redistribution of NOAA space weather data, including solar observation data, geomagnetic indices, and radiation belt models. Considers impact on commercial space weather services.',
    lastUpdated: '2026-01-22',
  },
  {
    id: 'congress-space-force',
    title: 'Congressional Space Force Funding Authorization',
    agency: 'Congress',
    status: 'In Committee',
    expectedDate: '2026-10-01',
    impact: 'Medium',
    sectors: ['Defense', 'Satellite', 'Launch'],
    docketNumber: 'H.R. 5102',
    summary: 'FY2027 National Defense Authorization Act provisions for US Space Force, including space domain awareness upgrades, missile warning satellite constellation recapitalization, and commercial space integration strategy.',
    lastUpdated: '2026-02-11',
  },
  {
    id: 'fcc-debris-bond',
    title: 'FCC Orbital Debris Mitigation Bond Requirements',
    agency: 'FCC',
    status: 'Active',
    expectedDate: '2026-09-30',
    impact: 'High',
    sectors: ['Satellite', 'Space Sustainability'],
    docketNumber: 'IB Docket No. 24-087',
    summary: 'Rulemaking requiring satellite operators to post financial bonds or demonstrate insurance coverage for orbital debris removal costs. Proposes a per-satellite bond amount scaled by orbital altitude and constellation size.',
    lastUpdated: '2026-02-25',
    commentDeadline: '2026-05-31',
  },
  {
    id: 'dod-sda-procurement',
    title: 'DoD Space Development Agency Procurement Rules',
    agency: 'DoD',
    status: 'Active',
    expectedDate: '2026-07-15',
    impact: 'Medium',
    sectors: ['Defense', 'Satellite'],
    docketNumber: 'DFARS Case 2025-D029',
    summary: 'Updated procurement regulations for SDA proliferated warfighter space architecture (PWSA), including Transport Layer and Tracking Layer constellations. Streamlines vendor qualification for rapid acquisition spiral development.',
    lastUpdated: '2026-02-17',
  },
  {
    id: 'esa-clean-space',
    title: 'ESA Clean Space Initiative Regulations',
    agency: 'International',
    status: 'Active',
    expectedDate: '2026-12-31',
    impact: 'Medium',
    sectors: ['Satellite', 'Space Sustainability'],
    summary: 'European Space Agency initiative establishing mandatory eco-design requirements for ESA-funded missions, including spacecraft passivation, deorbit planning, and use of Design-for-Demise techniques. Influences European national space agency procurement.',
    lastUpdated: '2026-02-06',
  },
  {
    id: 'itu-wrc27',
    title: 'ITU World Radiocommunication Conference 2027 Agenda',
    agency: 'International',
    status: 'Under Review',
    expectedDate: '2027-11-01',
    impact: 'High',
    sectors: ['Spectrum', 'Satellite'],
    summary: 'Preparatory work for WRC-27 agenda items affecting satellite services, including new frequency allocations for NGSO systems in Ka/V-band, review of EPFD limits for mega-constellations, and spectrum for inter-satellite links.',
    lastUpdated: '2026-02-21',
  },
  {
    id: 'un-copuos-lts',
    title: 'UN COPUOS Long-Term Sustainability Guidelines Implementation',
    agency: 'International',
    status: 'Active',
    expectedDate: '2027-06-01',
    impact: 'Medium',
    sectors: ['Space Sustainability', 'Satellite'],
    summary: 'Working group developing binding implementation mechanisms for the 21 LTS guidelines adopted in 2019. Topics include space traffic management coordination, debris remediation responsibilities, and registry notification requirements.',
    lastUpdated: '2026-02-13',
  },
  {
    id: 'fcc-25ghz-allocation',
    title: 'FCC 25.25-27.5 GHz Band Reallocation',
    agency: 'FCC',
    status: 'Comment Period',
    expectedDate: '2026-11-15',
    impact: 'Medium',
    sectors: ['Spectrum', 'Satellite'],
    docketNumber: 'WT Docket No. 25-44',
    summary: 'Proposed reallocation of spectrum in the 25.25-27.5 GHz band to accommodate both 5G terrestrial services and satellite earth station operations. Evaluates sharing criteria and transition mechanisms for incumbent satellite services.',
    lastUpdated: '2026-02-23',
    commentDeadline: '2026-05-01',
  },
  {
    id: 'faa-space-traffic',
    title: 'FAA Space Traffic Coordination Standards',
    agency: 'FAA',
    status: 'Proposed',
    expectedDate: '2027-06-30',
    impact: 'High',
    sectors: ['Satellite', 'Launch', 'Space Sustainability'],
    docketNumber: 'FAA-2026-0412',
    summary: 'Proposed standards for civil space traffic coordination, including conjunction assessment data sharing requirements, maneuver notification protocols, and integration with DoD space surveillance network. Addresses commercial SSA provider certification.',
    lastUpdated: '2026-02-26',
    commentDeadline: '2026-08-30',
  },
];

// ════════════════════════════════════════
// Agency Configuration
// ════════════════════════════════════════

const AGENCY_CONFIG: Record<Agency, { label: string; color: string; bgColor: string; borderColor: string; focusAreas: string[] }> = {
  FCC: {
    label: 'FCC',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
    borderColor: 'border-blue-500/30',
    focusAreas: ['Spectrum allocation', 'Satellite licensing', 'Debris mitigation', 'D2D services'],
  },
  FAA: {
    label: 'FAA',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
    focusAreas: ['Launch licensing', 'Human spaceflight', 'Reentry vehicles', 'Environmental review'],
  },
  NOAA: {
    label: 'NOAA',
    color: 'text-slate-300',
    bgColor: 'bg-white/8',
    borderColor: 'border-white/10',
    focusAreas: ['Remote sensing licenses', 'Weather data policy', 'Commercial imagery'],
  },
  DoC: {
    label: 'Dept. of Commerce',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
    focusAreas: ['Export controls (ITAR/EAR)', 'Technology transfer', 'Trade compliance'],
  },
  DoD: {
    label: 'Dept. of Defense',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/30',
    focusAreas: ['Space Force procurement', 'SDA architecture', 'SSA coordination'],
  },
  Congress: {
    label: 'US Congress',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
    borderColor: 'border-purple-500/30',
    focusAreas: ['Space legislation', 'NASA authorization', 'Defense funding', 'Regulatory moratorium'],
  },
  International: {
    label: 'International',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/15',
    borderColor: 'border-teal-500/30',
    focusAreas: ['ITU spectrum coordination', 'UN COPUOS guidelines', 'ESA eco-design', 'Multilateral treaties'],
  },
};

const IMPACT_CONFIG: Record<ImpactLevel, { color: string; bgColor: string; dot: string }> = {
  High: { color: 'text-red-400', bgColor: 'bg-red-500/15', dot: 'bg-red-400' },
  Medium: { color: 'text-amber-400', bgColor: 'bg-amber-500/15', dot: 'bg-amber-400' },
  Low: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', dot: 'bg-emerald-400' },
};

const STATUS_CONFIG: Record<ProceedingStatus, { color: string; bgColor: string }> = {
  Active: { color: 'text-green-400', bgColor: 'bg-green-500/15' },
  'Comment Period': { color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' },
  'Under Review': { color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  Proposed: { color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  'Final Rule Pending': { color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
  Enacted: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  'In Committee': { color: 'text-indigo-400', bgColor: 'bg-indigo-500/15' },
};

const ALL_SECTORS: Sector[] = ['Launch', 'Satellite', 'Spectrum', 'Remote Sensing', 'Human Spaceflight', 'Defense', 'Export Control', 'Space Sustainability'];

const IMPACT_ORDER: Record<ImpactLevel, number> = { High: 0, Medium: 1, Low: 2 };

const EXPORT_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'agency', label: 'Agency' },
  { key: 'status', label: 'Status' },
  { key: 'impact', label: 'Impact' },
  { key: 'expectedDate', label: 'Expected Date' },
  { key: 'sectors', label: 'Sectors' },
  { key: 'docketNumber', label: 'Docket Number' },
  { key: 'summary', label: 'Summary' },
  { key: 'lastUpdated', label: 'Last Updated' },
];

// ════════════════════════════════════════
// Helper Functions
// ════════════════════════════════════════

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ════════════════════════════════════════
// Page Component
// ════════════════════════════════════════

export default function RegulatoryTrackerPage() {
  // Filters
  const [impactFilter, setImpactFilter] = useState<ImpactLevel | 'All'>('All');
  const [agencyFilters, setAgencyFilters] = useState<Agency[]>([]);
  const [sectorFilters, setSectorFilters] = useState<Sector[]>([]);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter toggle handlers
  const toggleAgency = useCallback((agency: Agency) => {
    setAgencyFilters(prev =>
      prev.includes(agency) ? prev.filter(a => a !== agency) : [...prev, agency]
    );
  }, []);

  const toggleSector = useCallback((sector: Sector) => {
    setSectorFilters(prev =>
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortAsc(a => !a);
        return field;
      }
      setSortAsc(true);
      return field;
    });
  }, []);

  // Filtered and sorted proceedings
  const filteredProceedings = useMemo(() => {
    let items = [...PROCEEDINGS];

    if (impactFilter !== 'All') {
      items = items.filter(p => p.impact === impactFilter);
    }
    if (agencyFilters.length > 0) {
      items = items.filter(p => agencyFilters.includes(p.agency));
    }
    if (sectorFilters.length > 0) {
      items = items.filter(p => p.sectors.some(s => sectorFilters.includes(s)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        (p.docketNumber && p.docketNumber.toLowerCase().includes(q))
      );
    }

    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
          break;
        case 'impact':
          cmp = IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact];
          break;
        case 'agency':
          cmp = a.agency.localeCompare(b.agency);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return items;
  }, [impactFilter, agencyFilters, sectorFilters, searchQuery, sortField, sortAsc]);

  // Agency stats
  const agencyStats = useMemo(() => {
    const stats: Record<Agency, number> = { FCC: 0, FAA: 0, NOAA: 0, DoC: 0, DoD: 0, Congress: 0, International: 0 };
    PROCEEDINGS.forEach(p => { stats[p.agency]++; });
    return stats;
  }, []);

  // Impact stats
  const impactStats = useMemo(() => {
    const stats = { High: 0, Medium: 0, Low: 0 };
    PROCEEDINGS.forEach(p => { stats[p.impact]++; });
    return stats;
  }, []);

  // Timeline data
  const timelineMonths = useMemo(() => {
    const months = new Map<string, RegulatoryProceeding[]>();
    filteredProceedings.forEach(p => {
      const key = p.expectedDate.substring(0, 7); // YYYY-MM
      if (!months.has(key)) months.set(key, []);
      months.get(key)!.push(p);
    });
    return Array.from(months.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProceedings]);

  // Upcoming comment deadlines
  const upcomingDeadlines = useMemo(() => {
    return PROCEEDINGS
      .filter(p => p.commentDeadline && daysUntil(p.commentDeadline) > 0)
      .sort((a, b) => new Date(a.commentDeadline!).getTime() - new Date(b.commentDeadline!).getTime());
  }, []);

  // Export data
  const exportData = useMemo(() =>
    filteredProceedings.map(p => ({
      ...p,
      sectors: p.sectors.join(', '),
    })),
    [filteredProceedings]
  );

  const activeFilters = agencyFilters.length + sectorFilters.length + (impactFilter !== 'All' ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">

        <AnimatedPageHeader
          title="Space Regulatory Tracker"
          subtitle="Track active regulatory proceedings, proposed rules, and legislation affecting the space industry across federal agencies and international bodies."
          accentColor="purple"
        >
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm text-slate-400">
              {PROCEEDINGS.length} proceedings tracked &middot; {impactStats.High} high-impact
            </span>
            <ExportButton
              data={exportData}
              filename="space-regulatory-tracker"
              columns={EXPORT_COLUMNS}
              label="Export Proceedings"
            />
          </div>
        </AnimatedPageHeader>

        {/* ──── Agency Dashboard ──── */}
        <ScrollReveal>
          <h2 className="text-xl font-semibold text-white mb-4">Agency Dashboard</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
            {(Object.keys(AGENCY_CONFIG) as Agency[]).map(agency => {
              const config = AGENCY_CONFIG[agency];
              const count = agencyStats[agency];
              const isSelected = agencyFilters.includes(agency);
              return (
                <button
                  key={agency}
                  onClick={() => toggleAgency(agency)}
                  className={`card p-4 text-left transition-all cursor-pointer ${
                    isSelected ? `ring-2 ring-offset-1 ring-offset-slate-900 ${config.borderColor.replace('/30', '/70')}` : ''
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className={`text-xs font-medium uppercase tracking-wider ${config.color} mb-1`}>
                    {config.label}
                  </div>
                  <div className="text-2xl font-bold text-white">{count}</div>
                  <div className="text-xs text-slate-400 mt-1">active proceeding{count !== 1 ? 's' : ''}</div>
                  <div className="mt-2 space-y-0.5">
                    {config.focusAreas.slice(0, 2).map(area => (
                      <div key={area} className="text-[10px] text-slate-500 truncate">{area}</div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* ──── Upcoming Comment Deadlines ──── */}
        {upcomingDeadlines.length > 0 && (
          <ScrollReveal>
            <div className="card p-5 mb-8 border-amber-500/30">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Upcoming Comment Deadlines
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingDeadlines.map(p => {
                  const days = daysUntil(p.commentDeadline!);
                  return (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                      <div className={`flex-shrink-0 mt-0.5 text-xs font-bold px-2 py-1 rounded ${
                        days <= 30 ? 'bg-red-500/20 text-red-400' : days <= 60 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-300'
                      }`}>
                        {days}d
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-white font-medium truncate">{p.title}</div>
                        <div className="text-xs text-slate-400">
                          {formatDate(p.commentDeadline!)} &middot; {p.agency}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ──── Filters & Search ──── */}
        <ScrollReveal>
          <div className="card p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search proceedings, docket numbers..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/15 focus:ring-1 focus:ring-white/30/30 transition-colors"
                />
              </div>

              {/* Impact Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">Impact:</span>
                <div className="flex gap-1">
                  {(['All', 'High', 'Medium', 'Low'] as const).map(level => (
                    <button
                      key={level}
                      onClick={() => setImpactFilter(level)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        impactFilter === level
                          ? level === 'All'
                            ? 'bg-slate-600 text-white'
                            : `${IMPACT_CONFIG[level as ImpactLevel].bgColor} ${IMPACT_CONFIG[level as ImpactLevel].color}`
                          : 'bg-slate-800/50 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">Sort:</span>
                <select
                  value={sortField}
                  onChange={e => handleSort(e.target.value as SortField)}
                  className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/15"
                >
                  <option value="date">Expected Date</option>
                  <option value="impact">Impact Level</option>
                  <option value="agency">Agency</option>
                  <option value="title">Title</option>
                </select>
                <button
                  onClick={() => setSortAsc(a => !a)}
                  className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                  title={sortAsc ? 'Sort ascending' : 'Sort descending'}
                >
                  <svg className={`w-4 h-4 transition-transform ${sortAsc ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-1 border-l border-slate-700/50 pl-4">
                {([
                  { mode: 'table' as ViewMode, icon: 'M3 10h18M3 14h18M3 18h18M3 6h18' },
                  { mode: 'cards' as ViewMode, icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
                  { mode: 'timeline' as ViewMode, icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                ]).map(({ mode, icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === mode ? 'bg-white/10 text-slate-300' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                    }`}
                    title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Sector Filter Tags */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-slate-400 self-center mr-1">Sectors:</span>
              {ALL_SECTORS.map(sector => {
                const isActive = sectorFilters.includes(sector);
                return (
                  <button
                    key={sector}
                    onClick={() => toggleSector(sector)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                      isActive
                        ? 'bg-white/10 border-white/15 text-slate-200'
                        : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:text-slate-300 hover:border-slate-600/60'
                    }`}
                    aria-pressed={isActive}
                  >
                    {sector}
                  </button>
                );
              })}

              {activeFilters > 0 && (
                <button
                  onClick={() => {
                    setImpactFilter('All');
                    setAgencyFilters([]);
                    setSectorFilters([]);
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1 text-xs rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  Clear all ({activeFilters})
                </button>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* ──── Results Count ──── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-400">
            Showing {filteredProceedings.length} of {PROCEEDINGS.length} proceedings
          </p>
        </div>

        {/* ──── Timeline View ──── */}
        {viewMode === 'timeline' && (
          <ScrollReveal>
            <div className="card p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-6">Expected Completion Timeline</h3>
              {timelineMonths.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No proceedings match the current filters.</p>
              ) : (
                <div className="relative">
                  {/* Horizontal timeline line */}
                  <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-700/60" />
                  <div className="flex overflow-x-auto gap-0 pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {timelineMonths.map(([monthKey, items]) => (
                      <div key={monthKey} className="flex-shrink-0 min-w-[200px] px-2 first:pl-0 last:pr-0">
                        {/* Month marker */}
                        <div className="relative flex flex-col items-center mb-4">
                          <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-900 z-10" />
                          <span className="text-xs font-medium text-slate-300 mt-2">
                            {getMonthLabel(monthKey + '-01')}
                          </span>
                          <span className="text-[10px] text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                        </div>
                        {/* Items */}
                        <div className="space-y-2">
                          {items.map(p => (
                            <button
                              key={p.id}
                              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                              className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                                expandedId === p.id
                                  ? 'bg-slate-800/80 border-white/15/40'
                                  : 'bg-slate-800/40 border-slate-700/30 hover:border-slate-600/50'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${IMPACT_CONFIG[p.impact].dot}`} />
                                <div className="min-w-0">
                                  <div className="text-xs text-white font-medium leading-tight line-clamp-2">{p.title}</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    <span className={AGENCY_CONFIG[p.agency].color}>{p.agency}</span>
                                    {' '}&middot; {formatDate(p.expectedDate)}
                                  </div>
                                  {expandedId === p.id && (
                                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{p.summary}</p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* ──── Table View ──── */}
        {viewMode === 'table' && (
          <ScrollReveal>
            <div className="card overflow-hidden mb-8">
              {/* Table header */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-4 p-4 bg-slate-800/50 border-b border-slate-700/50 text-xs font-medium uppercase tracking-wider text-slate-400">
                <button onClick={() => handleSort('title')} className="col-span-4 text-left hover:text-white transition-colors flex items-center gap-1">
                  Proceeding {sortField === 'title' && <span>{sortAsc ? '\u2191' : '\u2193'}</span>}
                </button>
                <button onClick={() => handleSort('agency')} className="col-span-1 text-left hover:text-white transition-colors flex items-center gap-1">
                  Agency {sortField === 'agency' && <span>{sortAsc ? '\u2191' : '\u2193'}</span>}
                </button>
                <div className="col-span-2 text-left">Status</div>
                <button onClick={() => handleSort('impact')} className="col-span-1 text-left hover:text-white transition-colors flex items-center gap-1">
                  Impact {sortField === 'impact' && <span>{sortAsc ? '\u2191' : '\u2193'}</span>}
                </button>
                <button onClick={() => handleSort('date')} className="col-span-2 text-left hover:text-white transition-colors flex items-center gap-1">
                  Expected Date {sortField === 'date' && <span>{sortAsc ? '\u2191' : '\u2193'}</span>}
                </button>
                <div className="col-span-2 text-left">Sectors</div>
              </div>

              {filteredProceedings.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-400">No proceedings match the current filters.</p>
                  <button
                    onClick={() => {
                      setImpactFilter('All');
                      setAgencyFilters([]);
                      setSectorFilters([]);
                      setSearchQuery('');
                    }}
                    className="mt-3 text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <StaggerContainer>
                  {filteredProceedings.map(p => {
                    const agencyConf = AGENCY_CONFIG[p.agency];
                    const impactConf = IMPACT_CONFIG[p.impact];
                    const statusConf = STATUS_CONFIG[p.status];
                    const isExpanded = expandedId === p.id;
                    const days = daysUntil(p.expectedDate);

                    return (
                      <StaggerItem key={p.id}>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : p.id)}
                          className="w-full text-left border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                        >
                          {/* Desktop row */}
                          <div className="hidden lg:grid lg:grid-cols-12 gap-4 p-4 items-center">
                            <div className="col-span-4">
                              <div className="text-sm text-white font-medium leading-tight">{p.title}</div>
                              {p.docketNumber && (
                                <div className="text-[11px] text-slate-500 mt-0.5">{p.docketNumber}</div>
                              )}
                            </div>
                            <div className="col-span-1">
                              <span className={`text-xs font-medium ${agencyConf.color}`}>{p.agency}</span>
                            </div>
                            <div className="col-span-2">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${statusConf.bgColor} ${statusConf.color}`}>
                                {p.status}
                              </span>
                            </div>
                            <div className="col-span-1">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${impactConf.bgColor} ${impactConf.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${impactConf.dot}`} />
                                {p.impact}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <div className="text-sm text-slate-300">{formatDate(p.expectedDate)}</div>
                              <div className={`text-[11px] ${days <= 30 ? 'text-amber-400' : days <= 90 ? 'text-slate-400' : 'text-slate-500'}`}>
                                {days > 0 ? `${days} days remaining` : days === 0 ? 'Today' : 'Past due'}
                              </div>
                            </div>
                            <div className="col-span-2 flex flex-wrap gap-1">
                              {p.sectors.slice(0, 2).map(s => (
                                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
                                  {s}
                                </span>
                              ))}
                              {p.sectors.length > 2 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500">
                                  +{p.sectors.length - 2}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Mobile row */}
                          <div className="lg:hidden p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm text-white font-medium leading-tight">{p.title}</div>
                              <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${impactConf.bgColor} ${impactConf.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${impactConf.dot}`} />
                                {p.impact}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className={agencyConf.color}>{p.agency}</span>
                              <span className={`px-2 py-0.5 rounded-full ${statusConf.bgColor} ${statusConf.color}`}>{p.status}</span>
                              <span className="text-slate-400">{formatDate(p.expectedDate)}</span>
                            </div>
                          </div>
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 bg-slate-800/20 border-b border-slate-700/30">
                            <p className="text-sm text-slate-300 leading-relaxed mb-3">{p.summary}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                              {p.docketNumber && (
                                <div>
                                  <span className="text-slate-500">Docket: </span>
                                  <span className="text-slate-300">{p.docketNumber}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-slate-500">Last Updated: </span>
                                <span className="text-slate-300">{formatDate(p.lastUpdated)}</span>
                              </div>
                              {p.commentDeadline && (
                                <div>
                                  <span className="text-slate-500">Comment Deadline: </span>
                                  <span className={daysUntil(p.commentDeadline) <= 30 ? 'text-amber-400 font-medium' : 'text-slate-300'}>
                                    {formatDate(p.commentDeadline)}
                                    {daysUntil(p.commentDeadline) > 0 && ` (${daysUntil(p.commentDeadline)}d remaining)`}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {p.sectors.map(s => (
                                <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/30">
                                  {s}
                                </span>
                              ))}
                            </div>
                            {p.url && (
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 mt-3 text-xs text-slate-300 hover:text-white transition-colors"
                              >
                                View Official Source
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )}
                          </div>
                        )}
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* ──── Cards View ──── */}
        {viewMode === 'cards' && (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {filteredProceedings.length === 0 ? (
              <div className="col-span-full p-12 text-center">
                <p className="text-slate-400">No proceedings match the current filters.</p>
                <button
                  onClick={() => {
                    setImpactFilter('All');
                    setAgencyFilters([]);
                    setSectorFilters([]);
                    setSearchQuery('');
                  }}
                  className="mt-3 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              filteredProceedings.map(p => {
                const agencyConf = AGENCY_CONFIG[p.agency];
                const impactConf = IMPACT_CONFIG[p.impact];
                const statusConf = STATUS_CONFIG[p.status];
                const days = daysUntil(p.expectedDate);

                return (
                  <StaggerItem key={p.id}>
                    <div className="card p-5 h-full flex flex-col">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${agencyConf.color}`}>
                          {agencyConf.label}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${impactConf.bgColor} ${impactConf.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${impactConf.dot}`} />
                          {p.impact}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-white mb-2 leading-tight">{p.title}</h3>

                      {/* Summary */}
                      <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-3 flex-1">
                        {p.summary}
                      </p>

                      {/* Meta */}
                      <div className="space-y-2 pt-3 border-t border-slate-700/30">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${statusConf.bgColor} ${statusConf.color}`}>
                            {p.status}
                          </span>
                          <div className="text-right">
                            <div className="text-xs text-slate-300">{formatDate(p.expectedDate)}</div>
                            <div className={`text-[10px] ${days <= 30 ? 'text-amber-400' : 'text-slate-500'}`}>
                              {days > 0 ? `${days}d remaining` : 'Past due'}
                            </div>
                          </div>
                        </div>
                        {p.docketNumber && (
                          <div className="text-[11px] text-slate-500">{p.docketNumber}</div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {p.sectors.map(s => (
                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
                              {s}
                            </span>
                          ))}
                        </div>
                        {p.commentDeadline && daysUntil(p.commentDeadline) > 0 && (
                          <div className={`text-[11px] ${daysUntil(p.commentDeadline) <= 30 ? 'text-amber-400' : 'text-slate-400'}`}>
                            Comment deadline: {formatDate(p.commentDeadline)}
                          </div>
                        )}
                      </div>
                    </div>
                  </StaggerItem>
                );
              })
            )}
          </StaggerContainer>
        )}

        {/* ──── Impact Summary ──── */}
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {(['High', 'Medium', 'Low'] as ImpactLevel[]).map(level => {
              const conf = IMPACT_CONFIG[level];
              const count = impactStats[level];
              const items = PROCEEDINGS.filter(p => p.impact === level);
              return (
                <div key={level} className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${conf.dot}`} />
                    <h3 className={`text-sm font-semibold ${conf.color}`}>{level} Impact</h3>
                    <span className="text-sm text-slate-500 ml-auto">{count}</span>
                  </div>
                  <div className="space-y-2">
                    {items.slice(0, 4).map(p => (
                      <div key={p.id} className="flex items-start gap-2 text-xs">
                        <span className={`flex-shrink-0 mt-0.5 ${AGENCY_CONFIG[p.agency].color}`}>{p.agency}</span>
                        <span className="text-slate-300 leading-tight line-clamp-1">{p.title}</span>
                      </div>
                    ))}
                    {items.length > 4 && (
                      <div className="text-[11px] text-slate-500">+{items.length - 4} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>

        {/* ──── Sector Breakdown ──── */}
        <ScrollReveal>
          <h2 className="text-xl font-semibold text-white mb-4">Sector Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {ALL_SECTORS.map(sector => {
              const count = PROCEEDINGS.filter(p => p.sectors.includes(sector)).length;
              const highCount = PROCEEDINGS.filter(p => p.sectors.includes(sector) && p.impact === 'High').length;
              return (
                <button
                  key={sector}
                  onClick={() => toggleSector(sector)}
                  className={`card p-4 text-left transition-all cursor-pointer ${
                    sectorFilters.includes(sector) ? 'ring-2 ring-white/15 ring-offset-1 ring-offset-slate-900' : ''
                  }`}
                  aria-pressed={sectorFilters.includes(sector)}
                >
                  <div className="text-xs text-slate-400 mb-1">{sector}</div>
                  <div className="text-xl font-bold text-white">{count}</div>
                  <div className="text-[10px] text-slate-500">
                    {highCount > 0 && <span className="text-red-400">{highCount} high-impact</span>}
                    {highCount > 0 && count - highCount > 0 && ' / '}
                    {count - highCount > 0 && <span>{count - highCount} other</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* ──── Key Regulatory Trends ──── */}
        <ScrollReveal>
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Key Regulatory Trends</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/30">
                <h4 className="text-sm font-medium text-purple-400 mb-2">Spectrum Contention Intensifying</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Multiple proceedings address the growing demand for satellite spectrum, particularly in Ku/Ka-band for mega-constellations and the new D2D (direct-to-device) services. The FCC is balancing terrestrial 5G expansion with protection of satellite downlinks.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/30">
                <h4 className="text-sm font-medium text-emerald-400 mb-2">Debris Mitigation Getting Teeth</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The FCC 5-year deorbit rule and proposed bond requirements signal a shift from voluntary guidelines to enforceable financial mechanisms. International bodies (ESA, UN COPUOS) are following with complementary frameworks for space sustainability.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/30">
                <h4 className="text-sm font-medium text-amber-400 mb-2">Launch Regulation Modernization</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  FAA Part 450 reform represents a fundamental shift to performance-based licensing, enabling reusable vehicle operations and higher launch cadence. Environmental review streamlining aims to remove bottlenecks at busy spaceports.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/30">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Export Control Liberalization</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ongoing ITAR reform efforts aim to transfer commercial satellite and launch vehicle components from USML to the CCL, reducing licensing burden for commercial operators while maintaining controls on military-critical technologies.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ──── Disclaimer ──── */}
        <div className="card p-4 mb-8 border-slate-700/40">
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-medium text-slate-400">Disclaimer:</span> This tracker is for informational purposes only and does not constitute legal advice. Proceeding statuses and expected dates are based on publicly available information and may change. Always consult official agency dockets and legal counsel for compliance decisions. Last data review: February 2026.
          </p>
        </div>

        {/* ──── Related Modules ──── */}
        <RelatedModules
          modules={[
            { name: 'Compliance Hub', description: 'Regulations, treaties, and filings', href: '/compliance', icon: '\u2696\uFE0F' },
            { name: 'Spectrum Management', description: 'Frequency allocations and auctions', href: '/spectrum', icon: '\uD83D\uDCE1' },
            { name: 'Company Profiles', description: 'Space industry company intelligence', href: '/company-profiles', icon: '\uD83C\uDFE2' },
            { name: 'Business Opportunities', description: 'Contracts and procurement', href: '/business-opportunities', icon: '\uD83D\uDCBC' },
            { name: 'News & Media', description: 'Latest space industry news', href: '/news', icon: '\uD83D\uDCF0' },
            { name: 'Satellite Tracker', description: 'Real-time orbital tracking', href: '/satellites', icon: '\uD83D\uDEF0\uFE0F' },
          ]}
        />
      </div>
    </div>
  );
}
