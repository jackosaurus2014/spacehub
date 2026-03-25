'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import Image from 'next/image';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { clientLogger } from '@/lib/client-logger';
import InlineDisclaimer from '@/components/InlineDisclaimer';
import DataFreshness from '@/components/ui/DataFreshness';
import PremiumGate from '@/components/PremiumGate';
import RelatedModules from '@/components/ui/RelatedModules';
import FAQSchema from '@/components/seo/FAQSchema';

import { getRegulatoryHubStats } from '@/lib/regulatory-hub-data';

import {
  type Treaty,
  type NationalLaw,
  type ArtemisSignatory,
  type LegalProceeding,
  type RegulatoryBody,
  type FilingsTabId,
  type FCCFiling,
  type FAALicense,
  type ITUFiling,
  type SECFiling,
  type FederalRegisterEntry,
} from './data';

// Lazy-load all tab section components
const SpaceLawSection = dynamic(() => import('./SpaceLawSection'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="h-20 bg-white/[0.06] rounded-lg"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{[1,2,3,4].map(i => <div key={i} className="h-48 bg-white/[0.06] rounded-lg"></div>)}</div>
    </div>
  ),
});
const FilingsSection = dynamic(() => import('./FilingsSection'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/[0.06] rounded-lg"></div>)}</div>
      <div className="h-16 bg-white/[0.06] rounded-lg"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-48 bg-white/[0.06] rounded-lg"></div>)}</div>
    </div>
  ),
});
const ProtestsSection = dynamic(() => import('./ProtestsSection'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="h-20 bg-white/[0.06] rounded-lg"></div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-white/[0.06] rounded-lg"></div>)}</div>
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-white/[0.06] rounded-lg"></div>)}</div>
    </div>
  ),
});
// Import the compliance tab components (they render inline based on activeSubTab)
import { PolicyTrackerTab, ComplianceWizardTab, CaseLawArchiveTab, ExportControlMonitorTab, ExpertCommentaryTab } from './ComplianceTab';
import { RegulatoryBodiesRefTab, KeyRegulationsTab, ComplianceChecklistsTab } from './QuickReferenceTab';
import type { BidProtest } from './ProtestsSection';

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

let BID_PROTESTS: BidProtest[] = [];

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
        <div className="h-8 bg-white/[0.06] rounded w-1/3"></div>
        <div className="h-4 bg-white/[0.06] rounded w-2/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-white/[0.06] rounded-lg"></div>
          ))}
        </div>
        <div className="flex gap-2 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-32 bg-white/[0.06] rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-white/[0.06] rounded-lg"></div>
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
          <div className="text-4xl font-bold font-display tracking-tight text-white/90">{stats.totalLicenseTypes}</div>
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
        <div role="tablist" className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {topSections.map((section) => (
            <button
              key={section.id}
              role="tab"
              aria-selected={activeSection === section.id}
              onClick={() => handleSectionChange(section.id)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-3 min-h-[44px] rounded-lg font-semibold text-sm transition-all whitespace-nowrap touch-target ${
                activeSection === section.id
                  ? 'bg-white text-slate-900'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.1]'
              }`}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none md:hidden" />
      </div>

      {/* Sub-Tab Navigation */}
      {activeSection === 'compliance' && (
        <div className="relative">
          <div role="tablist" className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            {complianceSubTabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeSubTab === tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg font-medium transition-all whitespace-nowrap touch-target ${
                  activeSubTab === tab.id
                    ? 'bg-white/[0.08] text-white border-white/[0.1]'
                    : 'bg-transparent text-slate-400 border border-white/[0.06] hover:border-slate-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none md:hidden" />
        </div>
      )}

      {activeSection === 'space-law' && (
        <div role="tablist" className="flex flex-wrap gap-2 mb-6">
          {spaceLawSubTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeSubTab === tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                  : 'bg-transparent text-slate-400 border border-white/[0.06] hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'filings' && (
        <div className="relative">
          <div role="tablist" className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {getFilingsTabs().map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeSubTab === tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeSubTab === tab.id
                    ? 'bg-white text-slate-900'
                    : 'bg-white/5 text-star-300 hover:bg-white/10'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSubTab === tab.id ? 'bg-white/20 text-slate-900' : 'bg-white/10 text-star-300'}`}>{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none md:hidden" />
        </div>
      )}

      {activeSection === 'protests' && (
        <div role="tablist" className="flex flex-wrap gap-2 mb-6">
          {protestsSubTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeSubTab === tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                  : 'bg-transparent text-slate-400 border border-white/[0.06] hover:border-slate-300'
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
                  ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                  : 'bg-transparent text-slate-400 border border-white/[0.06] hover:border-slate-300'
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
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/art/hero-regulatory.png"
            alt=""
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />
        </div>
        <div className="container mx-auto px-4 pt-6">
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
        </div>
      </div>

      <div className="container mx-auto px-4">
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

        {/* Related Reading */}
        <div className="mt-10 mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Related Reading
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'ITAR vs EAR: Export Controls for Space Hardware', slug: 'export-controls-space-hardware-itar-vs-ear' },
              { title: 'FAA Space Launch Licensing: Complete Guide', slug: 'faa-space-launch-licensing-complete-guide-2026' },
              { title: 'FCC Satellite Licensing: Spectrum & Orbital Slots', slug: 'fcc-satellite-licensing-spectrum-orbital-slots' },
            ].map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="group block p-4 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:border-violet-500/25 hover:bg-violet-500/[0.04] transition-all"
              >
                <p className="text-sm text-slate-300 group-hover:text-white transition-colors font-medium leading-snug">{article.title}</p>
                <span className="text-xs text-violet-400 mt-2 block">Read article &rarr;</span>
              </Link>
            ))}
          </div>
        </div>

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
