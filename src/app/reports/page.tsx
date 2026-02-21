'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { toast } from '@/lib/toast';

// ---------------------------------------------------------------------------
// Types (mirroring report-templates.ts for the client)
// ---------------------------------------------------------------------------

interface ReportSection {
  id: string;
  title: string;
  description: string;
}

interface ReportConfigField {
  id: string;
  label: string;
  type: 'select' | 'multi-select' | 'text' | 'typeahead';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required: boolean;
  min?: number;
  max?: number;
}

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  isSample: boolean;
  sections: ReportSection[];
  estimatedPages: number;
  generationTime: string;
  configFields: ReportConfigField[];
}

interface GeneratedReport {
  title: string;
  subtitle: string;
  generatedAt: string;
  reportType: string;
  executive_summary: string;
  methodology: string;
  sections: { id: string; title: string; content: string }[];
}

interface CompanySearchResult {
  slug: string;
  name: string;
  sector: string | null;
  tier: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPACE_SECTORS = [
  { value: 'launch-services', label: 'Launch Services' },
  { value: 'satellite-manufacturing', label: 'Satellite Manufacturing' },
  { value: 'earth-observation', label: 'Earth Observation' },
  { value: 'satellite-communications', label: 'Satellite Communications' },
  { value: 'space-defense', label: 'Space Defense & National Security' },
  { value: 'in-space-services', label: 'In-Space Services & Logistics' },
  { value: 'ground-segment', label: 'Ground Segment & Infrastructure' },
  { value: 'space-analytics', label: 'Space Data & Analytics' },
  { value: 'cislunar-economy', label: 'Cislunar & Lunar Economy' },
  { value: 'space-manufacturing', label: 'Space Manufacturing' },
  { value: 'space-tourism', label: 'Space Tourism & Human Spaceflight' },
  { value: 'smallsat-constellation', label: 'SmallSat & Constellation Services' },
  { value: 'propulsion', label: 'Propulsion Systems' },
  { value: 'space-debris', label: 'Space Debris & Sustainability' },
  { value: 'spectrum-management', label: 'Spectrum Management & RF' },
];

const REPORT_TYPES: ReportType[] = [
  {
    id: 'sector-overview',
    name: 'Sector Overview',
    description:
      'Comprehensive market overview including size, growth trajectories, key players, competitive dynamics, emerging trends, and 5-year forecasts for a specific space industry sector.',
    icon: 'chart-bar',
    price: 0,
    isSample: true,
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', description: 'High-level overview and key takeaways' },
      { id: 'market-size', title: 'Market Size & Growth', description: 'TAM, SAM, SOM with CAGR projections' },
      { id: 'key-players', title: 'Key Players & Market Share', description: 'Top companies and competitive positions' },
      { id: 'value-chain', title: 'Value Chain Analysis', description: 'End-to-end industry structure' },
      { id: 'trends', title: 'Technology & Market Trends', description: 'Emerging trends shaping the sector' },
      { id: 'regulatory', title: 'Regulatory Landscape', description: 'Key regulations and policy developments' },
      { id: 'investment', title: 'Investment & Funding Activity', description: 'Funding rounds and deal flow' },
      { id: 'forecasts', title: '5-Year Forecast', description: 'Growth projections and scenario analysis' },
      { id: 'risks', title: 'Risks & Challenges', description: 'Key risk factors' },
      { id: 'opportunities', title: 'Strategic Opportunities', description: 'Actionable opportunities' },
    ],
    estimatedPages: 15,
    generationTime: '2-3 minutes',
    configFields: [
      {
        id: 'sector',
        label: 'Select Sector',
        type: 'select',
        placeholder: 'Choose a sector to analyze...',
        options: SPACE_SECTORS,
        required: true,
      },
    ],
  },
  {
    id: 'company-deep-dive',
    name: 'Company Deep Dive',
    description:
      'In-depth company analysis covering financials, technology capabilities, competitive positioning, recent developments, leadership assessment, and strategic outlook.',
    icon: 'building',
    price: 49,
    isSample: false,
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', description: 'Company snapshot and investment thesis' },
      { id: 'company-overview', title: 'Company Overview', description: 'History, mission, and corporate structure' },
      { id: 'leadership', title: 'Leadership & Team', description: 'Key executives' },
      { id: 'products', title: 'Products & Services', description: 'Core offerings and technology' },
      { id: 'financials', title: 'Financial Analysis', description: 'Revenue, funding, valuation' },
      { id: 'market-position', title: 'Market Position', description: 'Competitive positioning' },
      { id: 'recent-developments', title: 'Recent Developments', description: 'Latest news and milestones' },
      { id: 'partnerships', title: 'Partnerships & Customers', description: 'Key relationships' },
      { id: 'swot', title: 'SWOT Analysis', description: 'Strengths, weaknesses, opportunities, threats' },
      { id: 'outlook', title: 'Strategic Outlook', description: 'Growth trajectory and projections' },
    ],
    estimatedPages: 12,
    generationTime: '2-3 minutes',
    configFields: [
      {
        id: 'companySlug',
        label: 'Select Company',
        type: 'typeahead',
        placeholder: 'Search for a company...',
        required: true,
      },
    ],
  },
  {
    id: 'competitive-analysis',
    name: 'Competitive Analysis',
    description:
      'Head-to-head comparison of 2-5 companies across technology capabilities, financials, market positioning, and strategic direction.',
    icon: 'scale',
    price: 79,
    isSample: false,
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', description: 'Key findings' },
      { id: 'company-profiles', title: 'Company Profiles', description: 'Brief overview of each company' },
      { id: 'capability-comparison', title: 'Capability Comparison', description: 'Side-by-side comparison' },
      { id: 'financial-comparison', title: 'Financial Comparison', description: 'Financial metrics' },
      { id: 'market-positioning', title: 'Market Positioning', description: 'Competitive positioning' },
      { id: 'customer-base', title: 'Customer & Contract Base', description: 'Key customers' },
      { id: 'technology', title: 'Technology Assessment', description: 'Technical capabilities' },
      { id: 'growth-trajectory', title: 'Growth Trajectory', description: 'Growth projections' },
      { id: 'competitive-dynamics', title: 'Competitive Dynamics', description: 'Rivalry and strategic moves' },
      { id: 'recommendation', title: 'Analyst Recommendation', description: 'Summary scorecard' },
    ],
    estimatedPages: 18,
    generationTime: '3-4 minutes',
    configFields: [
      {
        id: 'companySlugs',
        label: 'Select Companies to Compare',
        type: 'multi-select',
        placeholder: 'Search and select 2-5 companies...',
        required: true,
        min: 2,
        max: 5,
      },
    ],
  },
  {
    id: 'market-entry-brief',
    name: 'Market Entry Brief',
    description:
      'Strategic market entry analysis covering regulatory requirements, TAM sizing, competitive landscape, go-to-market strategy, and risk assessment.',
    icon: 'rocket',
    price: 99,
    isSample: false,
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', description: 'Opportunity assessment' },
      { id: 'market-definition', title: 'Market Definition & Scope', description: 'Target market boundaries' },
      { id: 'tam-analysis', title: 'TAM/SAM/SOM Analysis', description: 'Market sizing' },
      { id: 'regulatory', title: 'Regulatory Requirements', description: 'Licensing and compliance' },
      { id: 'competitive-landscape', title: 'Competitive Landscape', description: 'Existing players' },
      { id: 'customer-analysis', title: 'Customer Analysis', description: 'Target customers' },
      { id: 'barriers', title: 'Barriers to Entry', description: 'Entry barriers' },
      { id: 'gtm-strategy', title: 'Go-to-Market Strategy', description: 'Recommended approach' },
      { id: 'financial-model', title: 'Financial Projections', description: 'Revenue model' },
      { id: 'risk-assessment', title: 'Risk Assessment & Mitigation', description: 'Key risks' },
      { id: 'action-plan', title: '90-Day Action Plan', description: 'Prioritized next steps' },
    ],
    estimatedPages: 20,
    generationTime: '3-5 minutes',
    configFields: [
      {
        id: 'topic',
        label: 'Market / Opportunity Description',
        type: 'text',
        placeholder:
          'Describe the market or opportunity (e.g., "LEO broadband constellation for maritime customers")',
        required: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Icon components
// ---------------------------------------------------------------------------

function ReportIcon({ icon, className = '' }: { icon: string; className?: string }) {
  switch (icon) {
    case 'chart-bar':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    case 'building':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      );
    case 'scale':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
        </svg>
      );
    case 'rocket':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Generation status messages
// ---------------------------------------------------------------------------

const GENERATION_PHASES = [
  { message: 'Querying SpaceNexus database...', duration: 3000 },
  { message: 'Gathering company profiles and financial data...', duration: 4000 },
  { message: 'Analyzing recent news and market events...', duration: 5000 },
  { message: 'Generating AI-powered insights...', duration: 8000 },
  { message: 'Synthesizing findings and recommendations...', duration: 6000 },
  { message: 'Formatting report sections...', duration: 4000 },
  { message: 'Finalizing intelligence report...', duration: 3000 },
];

// ---------------------------------------------------------------------------
// Simple markdown renderer
// ---------------------------------------------------------------------------

function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="text-lg font-semibold text-slate-100 mt-6 mb-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-xl font-semibold text-slate-100 mt-6 mb-3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-2xl font-bold text-slate-100 mt-8 mb-4">$1</h2>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-100">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Blockquotes
    .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-cyan-500/30 pl-4 my-3 text-slate-400 italic">$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-slate-700 my-6" />')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-300">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-slate-300 list-decimal">$1</li>');

  // Wrap consecutive <li> elements in <ul> or <ol>
  html = html.replace(
    /(<li class="ml-4 text-slate-300">[\s\S]*?<\/li>(\n)?)+/g,
    (match) => `<ul class="list-disc space-y-1 my-3">${match}</ul>`
  );
  html = html.replace(
    /(<li class="ml-4 text-slate-300 list-decimal">[\s\S]*?<\/li>(\n)?)+/g,
    (match) => `<ol class="list-decimal space-y-1 my-3 ml-4">${match}</ol>`
  );

  // Tables
  html = html.replace(
    /\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g,
    (_match, headerRow: string, bodyRows: string) => {
      const headers = headerRow.split('|').map((h: string) => h.trim()).filter(Boolean);
      const rows = bodyRows.trim().split('\n').map((row: string) =>
        row.split('|').map((c: string) => c.trim()).filter(Boolean)
      );

      const headerHtml = headers
        .map((h: string) => `<th class="px-4 py-2 text-left text-sm font-semibold text-slate-200 border-b border-slate-600">${h}</th>`)
        .join('');
      const bodyHtml = rows
        .map(
          (row: string[]) =>
            `<tr class="border-b border-slate-700/50">${row.map((c: string) => `<td class="px-4 py-2 text-sm text-slate-300">${c}</td>`).join('')}</tr>`
        )
        .join('');

      return `<div class="overflow-x-auto my-4"><table class="w-full border-collapse"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
    }
  );

  // Paragraphs: wrap remaining lines that aren't already HTML
  html = html
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith('<') ||
        trimmed.startsWith('</') ||
        trimmed.startsWith('<li')
      ) {
        return line;
      }
      return `<p class="text-slate-300 mb-3">${trimmed}</p>`;
    })
    .join('\n');

  return html;
}

// ---------------------------------------------------------------------------
// Company search hook
// ---------------------------------------------------------------------------

function useCompanySearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/company-profiles?search=${encodeURIComponent(q)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setResults(
            (data.companies || []).map((c: { slug: string; name: string; sector: string | null; tier: number }) => ({
              slug: c.slug,
              name: c.name,
              sector: c.sector,
              tier: c.tier,
            }))
          );
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  return { query, results, loading, search, setQuery };
}

// ---------------------------------------------------------------------------
// Inner page component (uses useSearchParams)
// ---------------------------------------------------------------------------

function ReportsPageInner() {
  const searchParams = useSearchParams();

  // State
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [builderStep, setBuilderStep] = useState<'configure' | 'generating' | 'done'>('configure');
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [generationPhase, setGenerationPhase] = useState(0);
  const [activeTocSection, setActiveTocSection] = useState<string | null>(null);

  // Config state
  const [sector, setSector] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<CompanySearchResult[]>([]);
  const [topic, setTopic] = useState('');

  // Company search
  const companySearch = useCompanySearch();
  const multiSearch = useCompanySearch();

  // Refs
  const reportRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Handle URL params on mount
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam) {
      const rt = REPORT_TYPES.find((r) => r.id === typeParam);
      if (rt) setSelectedType(rt);
    }
  }, [searchParams]);

  // Cleanup phase timer
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  // Scroll to section on TOC click
  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current.get(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveTocSection(sectionId);
    }
  };

  // Generation progress animation
  const startPhaseAnimation = useCallback(() => {
    let phase = 0;
    setGenerationPhase(0);

    const advancePhase = () => {
      if (phase < GENERATION_PHASES.length - 1) {
        phase++;
        setGenerationPhase(phase);
        phaseTimerRef.current = setTimeout(advancePhase, GENERATION_PHASES[phase].duration);
      }
    };

    phaseTimerRef.current = setTimeout(advancePhase, GENERATION_PHASES[0].duration);
  }, []);

  // Generate report
  const handleGenerate = async () => {
    if (!selectedType) return;

    // Validate config
    let config: Record<string, unknown> = {};
    switch (selectedType.id) {
      case 'sector-overview':
        if (!sector) {
          toast.error('Please select a sector');
          return;
        }
        config = { sector };
        break;
      case 'company-deep-dive':
        if (!selectedCompany) {
          toast.error('Please select a company');
          return;
        }
        config = { companySlug: selectedCompany.slug };
        break;
      case 'competitive-analysis':
        if (selectedCompanies.length < 2) {
          toast.error('Please select at least 2 companies to compare');
          return;
        }
        config = { companySlugs: selectedCompanies.map((c) => c.slug) };
        break;
      case 'market-entry-brief':
        if (!topic || topic.trim().length < 10) {
          toast.error('Please provide a market/opportunity description (at least 10 characters)');
          return;
        }
        config = { topic: topic.trim() };
        break;
    }

    setBuilderStep('generating');
    startPhaseAnimation();

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: selectedType.id, config }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data?.error?.message || data?.error || 'Report generation failed';
        toast.error(errorMsg);
        setBuilderStep('configure');
        return;
      }

      if (data.report) {
        setGeneratedReport(data.report);
        setBuilderStep('done');
        toast.success('Intelligence report generated successfully');

        // Show usage info
        if (data.usage) {
          toast.info(
            `Reports used: ${data.usage.used}/${data.usage.limit} this month (${data.usage.tier} plan)`
          );
        }
      } else {
        toast.error('Unexpected response from server');
        setBuilderStep('configure');
      }
    } catch (err) {
      toast.error('Failed to connect to report generation service');
      setBuilderStep('configure');
    } finally {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    }
  };

  // Reset to catalog
  const handleBackToCatalog = () => {
    setSelectedType(null);
    setBuilderStep('configure');
    setGeneratedReport(null);
    setSector('');
    setSelectedCompany(null);
    setSelectedCompanies([]);
    setTopic('');
    setActiveTocSection(null);
    companySearch.setQuery('');
    multiSearch.setQuery('');
  };

  // Start new report (keep type selected)
  const handleNewReport = () => {
    setBuilderStep('configure');
    setGeneratedReport(null);
    setSector('');
    setSelectedCompany(null);
    setSelectedCompanies([]);
    setTopic('');
    setActiveTocSection(null);
    companySearch.setQuery('');
    multiSearch.setQuery('');
  };

  // Print / export
  const handlePrint = () => {
    window.print();
  };

  // Copy share link
  const handleShare = () => {
    const url = window.location.origin + '/reports';
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied to clipboard'),
      () => toast.error('Failed to copy link')
    );
  };

  // Add company to multi-select
  const addCompanyToComparison = (company: CompanySearchResult) => {
    if (selectedCompanies.length >= 5) {
      toast.warning('Maximum 5 companies for comparison');
      return;
    }
    if (selectedCompanies.find((c) => c.slug === company.slug)) {
      toast.warning('Company already selected');
      return;
    }
    setSelectedCompanies((prev) => [...prev, company]);
    multiSearch.setQuery('');
  };

  const removeCompanyFromComparison = (slug: string) => {
    setSelectedCompanies((prev) => prev.filter((c) => c.slug !== slug));
  };

  // ---------------------------------------------------------------------------
  // Render: Report Catalog
  // ---------------------------------------------------------------------------

  if (!selectedType) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <AnimatedPageHeader
            title="Intelligence Reports"
            subtitle="AI-powered research reports on space industry sectors, companies, and market opportunities. Generated from the SpaceNexus intelligence database."
            icon={
              <svg className="w-9 h-9 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            }
            accentColor="cyan"
          />

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-6 mb-10 text-sm text-slate-400"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full" />
              Powered by Claude AI
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              100+ Company Profiles
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full" />
              Real-time Market Data
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full" />
              15 Industry Sectors
            </div>
          </motion.div>

          {/* Report type cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REPORT_TYPES.map((rt, idx) => (
              <motion.div
                key={rt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx + 0.2 }}
                className="group relative bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-cyan-500/30 hover:bg-slate-800/70 transition-all duration-300"
              >
                {rt.isSample && (
                  <div className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30">
                    FREE SAMPLE
                  </div>
                )}

                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all">
                    <ReportIcon icon={rt.icon} className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-100 mb-1">{rt.name}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{rt.description}</p>
                  </div>
                </div>

                {/* Sections preview */}
                <div className="mb-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    {rt.sections.length} Sections
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {rt.sections.slice(0, 5).map((s) => (
                      <span
                        key={s.id}
                        className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded"
                      >
                        {s.title}
                      </span>
                    ))}
                    {rt.sections.length > 5 && (
                      <span className="text-xs text-slate-500">
                        +{rt.sections.length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>~{rt.estimatedPages} pages</span>
                    <span>{rt.generationTime}</span>
                  </div>
                  <button
                    onClick={() => setSelectedType(rt)}
                    className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all"
                  >
                    {rt.price === 0 ? 'Generate Free Report' : `Generate Report`}
                  </button>
                </div>

                {rt.price > 0 && (
                  <div className="absolute bottom-6 left-6 text-xs text-slate-500">
                    ${rt.price} / report
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-12 bg-slate-800/30 border border-slate-700/30 rounded-xl p-8"
          >
            <h2 className="text-xl font-semibold text-slate-100 mb-6 text-center">
              How Intelligence Reports Work
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  step: '1',
                  title: 'Choose Report Type',
                  desc: 'Select from sector overview, company deep dive, competitive analysis, or market entry brief.',
                },
                {
                  step: '2',
                  title: 'Configure Parameters',
                  desc: 'Select the sector, company, or market opportunity you want to analyze.',
                },
                {
                  step: '3',
                  title: 'AI Analysis',
                  desc: 'Claude AI analyzes data from 100+ company profiles, funding rounds, news, and market data.',
                },
                {
                  step: '4',
                  title: 'Review & Export',
                  desc: 'Review your professional report with executive summary, data tables, and actionable insights.',
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-lg flex items-center justify-center mx-auto mb-3">
                    {item.step}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Report Builder (configure / generating / done)
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Back button + header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button
            onClick={handleBackToCatalog}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Report Catalog
          </button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
              <ReportIcon icon={selectedType.icon} className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-100">{selectedType.name}</h1>
              <p className="text-slate-400 text-sm mt-0.5">{selectedType.description}</p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ----- Step: Configure ----- */}
          {builderStep === 'configure' && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl"
            >
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-6">Configure Your Report</h2>

                {/* Sector select */}
                {selectedType.id === 'sector-overview' && (
                  <div className="space-y-2">
                    <label htmlFor="sector" className="block text-sm font-medium text-slate-300">
                      Select Sector
                    </label>
                    <select
                      id="sector"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                    >
                      <option value="">Choose a sector to analyze...</option>
                      {SPACE_SECTORS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Company typeahead (single) */}
                {selectedType.id === 'company-deep-dive' && (
                  <div className="space-y-2">
                    <label htmlFor="company-search" className="block text-sm font-medium text-slate-300">
                      Select Company
                    </label>
                    {selectedCompany ? (
                      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg">
                        <span className="text-slate-200 font-medium">{selectedCompany.name}</span>
                        {selectedCompany.sector && (
                          <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded">
                            {selectedCompany.sector}
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedCompany(null)}
                          className="ml-auto text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          id="company-search"
                          type="text"
                          value={companySearch.query}
                          onChange={(e) => companySearch.search(e.target.value)}
                          placeholder="Search for a company..."
                          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                        />
                        {companySearch.loading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                          </div>
                        )}
                        {companySearch.results.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-600/50 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {companySearch.results.map((c) => (
                              <button
                                key={c.slug}
                                onClick={() => {
                                  setSelectedCompany(c);
                                  companySearch.setQuery('');
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors flex items-center gap-3"
                              >
                                <span className="text-slate-200">{c.name}</span>
                                {c.sector && (
                                  <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded">
                                    {c.sector}
                                  </span>
                                )}
                                <span className="ml-auto text-xs text-slate-500">Tier {c.tier}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Company multi-select */}
                {selectedType.id === 'competitive-analysis' && (
                  <div className="space-y-3">
                    <label htmlFor="multi-company-search" className="block text-sm font-medium text-slate-300">
                      Select Companies to Compare (2-5)
                    </label>

                    {/* Selected companies */}
                    {selectedCompanies.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedCompanies.map((c) => (
                          <span
                            key={c.slug}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-lg text-sm"
                          >
                            {c.name}
                            <button
                              onClick={() => removeCompanyFromComparison(c.slug)}
                              className="hover:text-red-400 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {selectedCompanies.length < 5 && (
                      <div className="relative">
                        <input
                          id="multi-company-search"
                          type="text"
                          value={multiSearch.query}
                          onChange={(e) => multiSearch.search(e.target.value)}
                          placeholder={
                            selectedCompanies.length === 0
                              ? 'Search and select 2-5 companies...'
                              : `Add another company (${selectedCompanies.length}/5)...`
                          }
                          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                        />
                        {multiSearch.loading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                          </div>
                        )}
                        {multiSearch.results.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-600/50 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {multiSearch.results
                              .filter((c) => !selectedCompanies.find((sc) => sc.slug === c.slug))
                              .map((c) => (
                                <button
                                  key={c.slug}
                                  onClick={() => addCompanyToComparison(c)}
                                  className="w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors flex items-center gap-3"
                                >
                                  <span className="text-slate-200">{c.name}</span>
                                  {c.sector && (
                                    <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded">
                                      {c.sector}
                                    </span>
                                  )}
                                  <span className="ml-auto text-xs text-slate-500">Tier {c.tier}</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Topic text input */}
                {selectedType.id === 'market-entry-brief' && (
                  <div className="space-y-2">
                    <label htmlFor="topic" className="block text-sm font-medium text-slate-300">
                      Market / Opportunity Description
                    </label>
                    <textarea
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder='Describe the market or opportunity you want to enter (e.g., "LEO broadband constellation for maritime customers" or "On-orbit servicing for GEO satellites")'
                      rows={4}
                      maxLength={2000}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-y"
                    />
                    <p className="text-xs text-slate-500 text-right">
                      {topic.length}/2000 characters
                    </p>
                  </div>
                )}

                {/* Report info */}
                <div className="mt-6 pt-4 border-t border-slate-700/30 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>~{selectedType.estimatedPages} pages</span>
                  <span>{selectedType.sections.length} sections</span>
                  <span>Estimated time: {selectedType.generationTime}</span>
                  {selectedType.price > 0 && <span>${selectedType.price} / report</span>}
                </div>

                {/* Generate button */}
                <div className="mt-6">
                  <button
                    onClick={handleGenerate}
                    className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
                  >
                    Generate {selectedType.name}
                  </button>
                </div>
              </div>

              {/* Sections preview */}
              <div className="mt-6 bg-slate-800/30 border border-slate-700/30 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
                  Report Sections
                </h3>
                <div className="space-y-2">
                  {selectedType.sections.map((s, idx) => (
                    <div key={s.id} className="flex items-start gap-3 py-2">
                      <span className="text-xs font-mono text-cyan-400/60 w-5 text-right flex-shrink-0 mt-0.5">
                        {idx + 1}.
                      </span>
                      <div>
                        <p className="text-sm text-slate-200 font-medium">{s.title}</p>
                        <p className="text-xs text-slate-500">{s.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ----- Step: Generating ----- */}
          {builderStep === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto text-center py-20"
            >
              {/* Animated spinner */}
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-slate-700/30" />
                <div
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin"
                  style={{ animationDuration: '1.5s' }}
                />
                <div
                  className="absolute inset-2 rounded-full border-4 border-transparent border-t-blue-400 animate-spin"
                  style={{ animationDuration: '2s', animationDirection: 'reverse' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ReportIcon icon={selectedType.icon} className="w-8 h-8 text-cyan-400" />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-slate-100 mb-3">
                Generating Your Report
              </h2>

              {/* Phase message */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={generationPhase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-slate-400 mb-6"
                >
                  {GENERATION_PHASES[generationPhase]?.message || 'Processing...'}
                </motion.p>
              </AnimatePresence>

              {/* Progress bar */}
              <div className="w-full max-w-sm mx-auto">
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                    initial={{ width: '5%' }}
                    animate={{
                      width: `${Math.min(((generationPhase + 1) / GENERATION_PHASES.length) * 100, 95)}%`,
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  This typically takes {selectedType.generationTime}
                </p>
              </div>
            </motion.div>
          )}

          {/* ----- Step: Done — Report Display ----- */}
          {builderStep === 'done' && generatedReport && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Report toolbar */}
              <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden">
                <button
                  onClick={handleNewReport}
                  className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
                >
                  New Report
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-2.25 0h.008v.008H16.5V12z" />
                  </svg>
                  Print / Export
                </button>
                <button
                  onClick={handleShare}
                  className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.572a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.69" />
                  </svg>
                  Share Link
                </button>
              </div>

              {/* Report layout: TOC sidebar + content */}
              <div className="flex gap-8">
                {/* Table of Contents sidebar — hidden on small screens and print */}
                <aside className="hidden lg:block w-64 flex-shrink-0 print:hidden">
                  <div className="sticky top-24">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Table of Contents
                    </h3>
                    <nav className="space-y-1">
                      {generatedReport.sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={`w-full text-left text-sm px-3 py-1.5 rounded transition-colors ${
                            activeTocSection === section.id
                              ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          }`}
                        >
                          {section.title}
                        </button>
                      ))}
                    </nav>
                  </div>
                </aside>

                {/* Report content */}
                <div ref={reportRef} className="flex-1 min-w-0">
                  {/* Report header */}
                  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-8 mb-8 print:border-none print:bg-white print:text-black">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 print:hidden">
                        <ReportIcon icon={selectedType.icon} className="w-7 h-7 text-cyan-400" />
                      </div>
                      <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-100 print:text-black">
                          {generatedReport.title}
                        </h1>
                        {generatedReport.subtitle && (
                          <p className="text-slate-400 mt-1 print:text-gray-600">{generatedReport.subtitle}</p>
                        )}
                      </div>
                    </div>

                    {/* Executive summary */}
                    {generatedReport.executive_summary && (
                      <div className="mt-4 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                        <p className="text-sm font-medium text-cyan-400 mb-1">Executive Summary</p>
                        <p className="text-slate-300 text-sm leading-relaxed print:text-gray-700">
                          {generatedReport.executive_summary}
                        </p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-500 print:text-gray-500">
                      <span>
                        Generated: {new Date(generatedReport.generatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>SpaceNexus Intelligence Platform</span>
                      <span>{generatedReport.sections.length} sections</span>
                    </div>
                  </div>

                  {/* Report sections */}
                  <div className="space-y-8">
                    {generatedReport.sections.map((section, idx) => (
                      <motion.div
                        key={section.id}
                        ref={(el) => {
                          if (el) sectionRefs.current.set(section.id, el);
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-6 md:p-8 print:border-none print:bg-white print:shadow-none"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-xs font-mono text-cyan-400/50 bg-cyan-500/5 border border-cyan-500/10 px-2 py-0.5 rounded print:hidden">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <h2 className="text-xl font-semibold text-slate-100 print:text-black">
                            {section.title}
                          </h2>
                        </div>
                        <div
                          className="prose prose-sm prose-slate max-w-none text-slate-300 print:text-gray-700 [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_td]:text-left"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                        />
                      </motion.div>
                    ))}
                  </div>

                  {/* Methodology footer */}
                  {generatedReport.methodology && (
                    <div className="mt-8 p-6 bg-slate-800/20 border border-slate-700/20 rounded-xl print:border-none">
                      <h3 className="text-sm font-semibold text-slate-400 mb-2">Methodology</h3>
                      <p className="text-xs text-slate-500 leading-relaxed print:text-gray-500">
                        {generatedReport.methodology}
                      </p>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-400/70 leading-relaxed">
                      <strong>Disclaimer:</strong> This report was generated by AI using data from the SpaceNexus
                      intelligence database and Claude AI analysis. While we strive for accuracy, all data and
                      projections should be independently verified before making investment or business decisions.
                      SpaceNexus is not a registered investment advisor.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:text-black {
            color: black !important;
          }
          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
          .print\\:text-gray-500 {
            color: #6b7280 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper with Suspense for useSearchParams
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      }
    >
      <ReportsPageInner />
    </Suspense>
  );
}
