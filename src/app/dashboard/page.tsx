'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { formatCompact } from '@/lib/format-number';
import { useIsMobile } from '@/hooks/useCompactNumber';
import Link from 'next/link';
import DashboardLayoutSelector from '@/components/DashboardLayoutSelector';
import ModuleConfigurator from '@/components/ModuleConfigurator';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import RecentlyViewed from '@/components/ui/RecentlyViewed';
import { SkeletonPage } from '@/components/ui/Skeleton';
import LaunchCountdown from '@/components/widgets/LaunchCountdown';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import {
  getEffectiveLayout,
  getGridColumnsClass,
  getModuleSizeClasses,
  isSectionVisible,
  type LayoutGridColumns,
  type ModuleSize,
  type DashboardSection,
} from '@/lib/dashboard-layouts';
import {
  getSelectedTemplate,
  clearSelectedTemplate,
  getWidgetTypeIcon,
  type DashboardTemplate,
} from '@/lib/dashboard/templates';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import StreakBadge from '@/components/mobile/StreakBadge';
import ExplorationProgress from '@/components/ui/ExplorationProgress';
import WhatsNewBanner from '@/components/WhatsNewBanner';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import ReferralWidget from '@/components/ReferralWidget';

/** Returns a time-of-day greeting with the user's name */
function getTimeGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return `Good morning, ${name}! \u2600\uFE0F`;
  if (hour >= 12 && hour <= 16) return `Good afternoon, ${name}! \u{1F324}\uFE0F`;
  if (hour >= 17 && hour <= 20) return `Good evening, ${name}! \u{1F306}`;
  return `Night owl mode, ${name}! \u{1F319}`;
}

interface ModuleItem {
  label: string;
  href: string;
  description: string;
  icon: string;
}

const QUICK_STATS = [
  { label: 'Companies Tracked', key: 'companyProfiles', icon: '\u{1F3E2}', href: '/company-profiles' },
  { label: 'Active Listings', key: 'serviceListings', icon: '\u{1F4CB}', href: '/marketplace' },
  { label: 'News Articles', key: 'newsArticles', icon: '\u{1F4F0}', href: '/news' },
  { label: 'Forum Threads', key: 'forumThreads', icon: '\u{1F4AC}', href: '/community/forums' },
];

const EXPLORE_MODULES: ModuleItem[] = [
  { icon: '\u{1F3AF}', label: 'Mission Control', href: '/mission-control', description: 'Upcoming launches and events' },
  { icon: '\u{1F4F0}', label: 'News & Categories', href: '/news', description: 'Latest space industry updates' },
  { icon: '\u{1F4DD}', label: 'Blogs & Articles', href: '/blogs', description: 'Expert industry insights' },
  { icon: '\u{1F6E1}\uFE0F', label: 'Space Defense', href: '/space-defense', description: 'Military space & national security' },
  { icon: '\u{1F916}', label: 'AI Insights', href: '/ai-insights', description: 'AI-powered industry analysis' },
  { icon: '\u{1FA90}', label: 'Solar Exploration', href: '/solar-exploration', description: '3D planetary visualization' },
  { icon: '\u{1F534}', label: 'Mars Mission Planner', href: '/mars-planner', description: 'Mars missions and launch windows' },
  { icon: '\u{1F319}', label: 'Cislunar Ecosystem', href: '/cislunar', description: 'Gateway, Artemis & lunar economy' },
  { icon: '\u2604\uFE0F', label: 'Asteroid Watch', href: '/asteroid-watch', description: 'NEOs, planetary defense, and mining' },
  { icon: '\u{1F5FA}\uFE0F', label: 'Market Map', href: '/market-map', description: 'Visual industry landscape by sector' },
  { icon: '\u{1F4DA}', label: 'Resources & Podcasts', href: '/resources', description: 'Curated content, podcasts & newsletters' },
  { icon: '\u{1F52E}', label: 'Mission Pipeline', href: '/mission-pipeline', description: 'Upcoming missions 2025-2030' },
  { icon: '\u{1F4C8}', label: 'Mission Statistics', href: '/mission-stats', description: 'Launch provider leaderboards & data' },
  { icon: '\u{1F4D1}', label: 'Daily Digest', href: '/news-digest', description: 'Quick-scan daily space headlines' },
  { icon: '\u{1F30D}', label: 'Orbit Guide', href: '/orbit-guide', description: 'Visual guide to orbital mechanics & orbit types' },
  { icon: '\u{1F3AF}', label: 'Career Guide', href: '/career-guide', description: 'Space industry career paths & salary data' },
  { icon: '\u{1F524}', label: 'Acronyms', href: '/acronyms', description: 'A-Z space industry acronym reference' },
  { icon: '\u{1F3DB}\uFE0F', label: 'Space Agencies', href: '/space-agencies', description: 'World space agency profiles & budgets' },
  { icon: '\u{1F399}\uFE0F', label: 'Space Podcasts', href: '/podcasts', description: '25+ space industry podcasts directory' },
  { icon: '\u{1F9F9}', label: 'Debris Remediation', href: '/debris-remediation', description: 'Active debris removal efforts and space sustainability' },
  { icon: '\u{1F6F8}', label: 'Debris Tracker', href: '/debris-tracker', description: 'Track orbital debris' },
  { icon: '\u{1F680}', label: 'Space Tourism', href: '/space-tourism', description: 'Space tourism providers' },
  { icon: '\u{1F4F0}', label: 'News Aggregator', href: '/news-aggregator', description: 'Curated multi-source news feed' },
  { icon: '\u2753', label: 'FAQ', href: '/faq', description: 'Frequently asked questions' },
];

const INTELLIGENCE_MODULES: ModuleItem[] = [
  { icon: '\u{1F4CA}', label: 'Market Intel', href: '/market-intel', description: 'Companies and stock tracking' },
  { icon: '\u{1F4B9}', label: 'Space Economy', href: '/space-economy', description: 'Market size, investment & budgets' },
  { icon: '\u{1F4B8}', label: 'Space Capital', href: '/space-capital', description: 'VC investors, startups & matchmaking' },
  { icon: '\u2696\uFE0F', label: 'Regulatory Hub', href: '/compliance', description: 'Compliance, space law & filings' },
  { icon: '\u2696\uFE0F', label: 'Space Law & Treaties', href: '/space-law', description: '20+ international treaties and regulatory frameworks' },
  { icon: '\u{1F4E1}', label: 'Spectrum Management', href: '/spectrum', description: 'Allocations, auctions & filings' },
  { icon: '\u{1F4CB}', label: 'Patent & IP Tracker', href: '/patents', description: 'Space technology patent trends' },
  { icon: '\u{1F4B0}', label: 'Investment Tracker', href: '/investment-tracker', description: 'Funding trends, top deals & investors' },
  { icon: '\u{1F3DB}\uFE0F', label: 'Government Budgets', href: '/government-budgets', description: 'Global space agency budget tracking' },
  { icon: '\u{1F4CB}', label: 'Intelligence Brief', href: '/intelligence-brief', description: 'Weekly curated industry briefing' },
  { icon: '\u{1F464}', label: 'Executive Moves', href: '/executive-moves', description: 'Leadership changes across the industry' },
  { icon: '\u{1F680}', label: 'Startup Tracker', href: '/startup-tracker', description: 'Emerging space companies & funding stages' },
  { icon: '\u{1F4CA}', label: 'Report Cards', href: '/report-cards', description: 'Quarterly company performance grades' },
  { icon: '\u{1F4BC}', label: 'Portfolio Tracker', href: '/portfolio-tracker', description: 'Track space investment portfolios' },
  { icon: '\u{1F4C8}', label: 'Industry Trends', href: '/industry-trends', description: 'Data-backed space industry trend analysis' },
  { icon: '\u{1F4DC}', label: 'Contract Awards', href: '/contract-awards', description: 'Government contract feed' },
  { icon: '\u{1F52C}', label: 'Tech Readiness', href: '/tech-readiness', description: 'Technology readiness levels' },
];

const BUSINESS_MODULES: ModuleItem[] = [
  { icon: '\u{1F4BC}', label: 'Business Opportunities', href: '/business-opportunities', description: 'AI-powered opportunity discovery' },
  { icon: '\u{1F465}', label: 'Space Talent Hub', href: '/space-talent', description: 'Jobs, experts & workforce analytics' },
  { icon: '\u{1F4CB}', label: 'Space Jobs Board', href: '/jobs', description: 'Browse and post space industry jobs' },
  { icon: '\u{1F517}', label: 'Global Supply Chain', href: '/supply-chain', description: 'Aerospace supply chain & shortage alerts' },
  { icon: '\u26CF\uFE0F', label: 'Space Mining', href: '/space-mining', description: 'Asteroid and planetary mining intelligence' },
  { icon: '\u{1F6E1}\uFE0F', label: 'Space Insurance', href: '/space-insurance', description: 'Risk calculator and market data' },
  { icon: '\u{1F3ED}', label: 'Manufacturing & Imagery', href: '/space-manufacturing', description: 'In-space manufacturing & EO providers' },
  { icon: '\u{1F4CA}', label: 'Deal Flow', href: '/deal-flow', description: 'Investment deals, M&A & partnerships' },
  { icon: '\u{1F4DC}', label: 'Contract Awards', href: '/contract-awards', description: 'Government & commercial contract tracker' },
  { icon: '\u{1F5FA}\uFE0F', label: 'Supply Chain Map', href: '/supply-chain-map', description: 'Interactive supplier relationship map' },
];

const TOOLS_MODULES: ModuleItem[] = [
  { icon: '\u{1F4B0}', label: 'Mission Cost Simulator', href: '/mission-cost', description: 'Estimate launch costs and fees' },
  { icon: '\u{1F680}', label: 'Launch Vehicle Comparison', href: '/launch-vehicles', description: 'Compare rocket specs and costs' },
  { icon: '\u{1F6F0}\uFE0F', label: 'Satellite Tracker', href: '/satellites', description: 'Track ISS, Starlink & weather satellites' },
  { icon: '\u{1F3D7}\uFE0F', label: 'Space Station Tracker', href: '/space-stations', description: 'ISS, Tiangong & commercial stations' },
  { icon: '\u{1F30D}', label: 'Orbital Management', href: '/orbital-slots', description: 'Orbital slots and satellite services' },
  { icon: '\u2728', label: 'Constellation Tracker', href: '/constellations', description: 'Satellite constellation monitoring' },
  { icon: '\u{1F4E1}', label: 'Ground Stations', href: '/ground-stations', description: 'Global ground station networks' },
  { icon: '\u{1F3DB}\uFE0F', label: 'Infrastructure Network', href: '/spaceports', description: 'Spaceports & communications networks' },
  { icon: '\u26A1', label: 'Resource Exchange', href: '/resource-exchange', description: 'Space commodity pricing' },
  { icon: '\u{1F5D3}\uFE0F', label: 'Launch Windows', href: '/launch-windows', description: 'Optimal launch timing' },
  { icon: '\u{1F324}\uFE0F', label: 'Space Environment', href: '/space-environment', description: 'Weather, debris & operations' },
  { icon: '\u{1F4D0}', label: 'Blueprint Series', href: '/blueprints', description: 'Technical hardware breakdowns' },
  { icon: '\u{1F9EE}', label: 'Launch Cost Calculator', href: '/launch-cost-calculator', description: 'Estimate launch costs by vehicle & orbit' },
  { icon: '\u{1F52C}', label: 'Tech Readiness', href: '/tech-readiness', description: 'Emerging technology TRL tracking' },
  { icon: '\u{1F525}', label: 'Propulsion Database', href: '/propulsion-database', description: 'Engine & thruster specifications' },
  { icon: '\u{1F4CD}', label: 'Launch Sites', href: '/launch-sites', description: 'Global spaceport database & capabilities' },
  { icon: '\u{1F4E1}', label: 'Frequency Bands', href: '/frequency-bands', description: 'Space communications RF spectrum reference' },
  { icon: '\u{1F9EA}', label: 'Materials Database', href: '/materials-database', description: 'Spacecraft materials & properties reference' },
  { icon: '\u{1F3D7}\uFE0F', label: 'ISRU Resource Utilization', href: '/isru', description: 'In-situ resource utilization analysis' },
  { icon: '\u{1F4E1}', label: 'Space Communications', href: '/space-comms', description: 'Satellite link budgets & communication systems' },
  { icon: '\u2728', label: 'Constellation Designer', href: '/constellation-designer', description: 'Design satellite constellations' },
  { icon: '\u{1F4B5}', label: 'Unit Economics', href: '/unit-economics', description: 'Revenue modeling calculator' },
  { icon: '\u{1F30D}', label: 'Orbital Calculator', href: '/orbital-calculator', description: 'Orbital mechanics calculator' },
  { icon: '\u{1F680}', label: 'Mission Simulator', href: '/mission-simulator', description: 'Simulate and plan space missions' },
  { icon: '\u{1F4D6}', label: 'Reading List', href: '/reading-list', description: 'Your saved articles' },
];

/** Animated counter that counts up from 0 to the target value */
function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out curve for a smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return <>{isMobile ? formatCompact(count) : count.toLocaleString()}</>;
}

function ModuleSection({ title, icon, modules, sizeClasses, delay }: {
  title: string;
  icon: string;
  modules: ModuleItem[];
  sizeClasses: ReturnType<typeof getModuleSizeClasses>;
  delay: string;
}) {
  if (modules.length === 0) return null;

  return (
    <ScrollReveal>
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          {title}
        </h2>
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {modules.map((mod) => (
            <StaggerItem key={mod.href}>
              <Link
                href={mod.href}
                className={`group relative card ${sizeClasses.padding} hover:border-white/10 hover:bg-white/[0.06] block`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{mod.icon}</span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors truncate">
                      {mod.label}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                      {mod.description}
                    </p>
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </ScrollReveal>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [layoutSelectorOpen, setLayoutSelectorOpen] = useState(false);
  const [moduleConfigOpen, setModuleConfigOpen] = useState(false);

  // Layout state
  const [gridColumns, setGridColumns] = useState<LayoutGridColumns>(2);
  const [moduleSize, setModuleSize] = useState<ModuleSize>('standard');
  const [sections, setSections] = useState<DashboardSection[]>([]);
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  // Quick Stats state
  const [overviewStats, setOverviewStats] = useState<Record<string, number>>({});
  const [statsLoading, setStatsLoading] = useState(true);

  // Module search state
  const [moduleSearch, setModuleSearch] = useState('');

  // Load layout on mount
  const loadLayout = useCallback(() => {
    const layout = getEffectiveLayout();
    setGridColumns(layout.gridColumns);
    setModuleSize(layout.moduleSize);
    setSections(layout.sections);
    setLayoutLoaded(true);
  }, []);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch overview stats
  useEffect(() => {
    const controller = new AbortController();
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/overview', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (data.stats) {
          setOverviewStats(data.stats);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Silently fail - stats are non-critical
      } finally {
        if (!controller.signal.aborted) setStatsLoading(false);
      }
    }
    fetchStats();
    return () => controller.abort();
  }, []);

  const handleLayoutChange = () => {
    loadLayout();
  };

  // Filter modules by search term
  const filterModules = useCallback((modules: ModuleItem[]) => {
    if (!moduleSearch.trim()) return modules;
    const term = moduleSearch.toLowerCase().trim();
    return modules.filter(
      (mod) =>
        mod.label.toLowerCase().includes(term) ||
        mod.description.toLowerCase().includes(term)
    );
  }, [moduleSearch]);

  const filteredExplore = useMemo(() => filterModules(EXPLORE_MODULES), [filterModules]);
  const filteredIntelligence = useMemo(() => filterModules(INTELLIGENCE_MODULES), [filterModules]);
  const filteredBusiness = useMemo(() => filterModules(BUSINESS_MODULES), [filterModules]);
  const filteredTools = useMemo(() => filterModules(TOOLS_MODULES), [filterModules]);

  const totalFilteredModules = filteredExplore.length + filteredIntelligence.length + filteredBusiness.length + filteredTools.length;
  const totalModules = EXPLORE_MODULES.length + INTELLIGENCE_MODULES.length + BUSINESS_MODULES.length + TOOLS_MODULES.length;

  if (status === 'loading' || !layoutLoaded) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 pt-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-sm text-slate-400">Loading live data...</span>
          </div>
        </div>
        <SkeletonPage statCards={4} statGridCols="grid-cols-2 md:grid-cols-4" contentCards={4} contentGridCols="grid-cols-1 md:grid-cols-2" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const sizeClasses = getModuleSizeClasses(moduleSize);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* What's New Banner */}
        <WhatsNewBanner />

        {/* Onboarding Checklist for new users */}
        <OnboardingChecklist />

        {/* Referral Widget */}
        <ScrollReveal>
          <div className="mb-8">
            <ReferralWidget />
          </div>
        </ScrollReveal>

        {/* Control Buttons */}
        <div className="flex justify-end gap-3 mb-4">
          <button
            onClick={() => setModuleConfigOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/10 border border-white/10 hover:border-white/15 text-white hover:text-white transition-all text-sm font-medium shadow-sm hover:shadow-md hover:shadow-black/5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure Modules
          </button>
          <button
            onClick={() => setLayoutSelectorOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-lg hover:border-white/10 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Customize Layout
          </button>
        </div>

        {/* Welcome Header - replaced h1 with AnimatedPageHeader */}
        {isSectionVisible('welcome', sections) && (
          <div className="bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-white/[0.06] border border-white/[0.06] rounded-2xl p-6 mb-8 animate-fade-in">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white/80 to-white/40 flex items-center justify-center text-black text-xl font-bold shrink-0">
                    {session.user?.name?.charAt(0)?.toUpperCase() || 'E'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <AnimatedPageHeader
                        title={getTimeGreeting(session.user?.name || 'Explorer')}
                        subtitle={session.user?.email || undefined}
                      />
                      <StreakBadge variant="compact" />
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-6 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white/70">{totalModules}</p>
                    <p className="text-xs text-slate-400">Modules</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white/70">4</p>
                    <p className="text-xs text-slate-400">Categories</p>
                  </div>
                </div>
              </div>
              <RelatedModules modules={PAGE_RELATIONS['dashboard']} />
            </div>
          </div>
        )}

        {/* Quick Stats Bar */}
        <ScrollReveal>
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {QUICK_STATS.map((stat) => (
              <StaggerItem key={stat.key}>
                <Link
                  href={stat.href}
                  className="group card p-4 hover:border-white/10 hover:bg-white/[0.06] block"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{stat.icon}</span>
                    <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white group-hover:text-white transition-colors">
                    {statsLoading ? (
                      <div className="h-8 w-16 bg-white/[0.08] rounded animate-pulse" />
                    ) : (
                      <AnimatedCounter target={overviewStats[stat.key] || 0} />
                    )}
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </ScrollReveal>

        {/* Quick Actions */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Latest News', href: '/news', icon: '📰', color: 'from-white/5 to-blue-500/20 border-white/10 hover:border-white/15' },
              { label: 'Company Intel', href: '/company-profiles', icon: '🏢', color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-400/50' },
              { label: 'Launch Schedule', href: '/mission-control', icon: '🚀', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 hover:border-emerald-400/50' },
              { label: 'Market Data', href: '/market-intel', icon: '📊', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 hover:border-amber-400/50' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`group flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r ${action.color} border transition-all hover:shadow-lg hover:shadow-black/50`}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
                <span className="text-sm font-semibold text-white group-hover:text-white transition-colors">{action.label}</span>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-white ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </ScrollReveal>

        {/* Launch Countdown Widget */}
        <ScrollReveal>
          <div className="mb-8">
            <LaunchCountdown />
          </div>
        </ScrollReveal>

        {/* Recently Viewed Section */}
        <ScrollReveal>
          <div className="mb-8">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recently Viewed
                </h2>
                <RecentlyViewed />
              </div>
              <RecentlyViewedInline />
            </div>
          </div>
        </ScrollReveal>

        {/* Exploration Progress */}
        <ScrollReveal>
          <div className="mb-8">
            <ExplorationProgress variant="card" />
          </div>
        </ScrollReveal>

        {/* Module Search / Filter */}
        <ScrollReveal>
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              placeholder={`Search across ${totalModules} modules...`}
              aria-label={`Search across ${totalModules} modules`}
              className="bg-white/[0.04] border border-white/[0.06] rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-400 focus:border-white/15 focus:outline-none w-full transition-colors"
            />
            {moduleSearch && (
              <button
                onClick={() => setModuleSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white/90 transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {moduleSearch && (
            <p className="text-xs text-slate-400 mt-2 ml-1">
              Showing {totalFilteredModules} of {totalModules} modules
            </p>
          )}
          {/* Category pills with counts */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { label: 'Explore', count: filteredExplore.length, total: EXPLORE_MODULES.length, icon: '🔭' },
              { label: 'Intelligence', count: filteredIntelligence.length, total: INTELLIGENCE_MODULES.length, icon: '📊' },
              { label: 'Business', count: filteredBusiness.length, total: BUSINESS_MODULES.length, icon: '💼' },
              { label: 'Tools', count: filteredTools.length, total: TOOLS_MODULES.length, icon: '🛠️' },
            ].map((cat) => (
              <span key={cat.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs text-slate-300">
                <span>{cat.icon}</span>
                <span className="font-medium">{cat.label}</span>
                <span className="text-slate-500 tabular-nums">{moduleSearch ? cat.count : cat.total}</span>
              </span>
            ))}
          </div>
        </div>
        </ScrollReveal>

        {/* Module Sections - matching sidebar order */}
        <ModuleSection
          title="Explore"
          icon={'\u{1F52D}'}
          modules={filteredExplore}
          sizeClasses={sizeClasses}
          delay="0.1s"
        />

        <ModuleSection
          title="Intelligence"
          icon={'\u{1F4CA}'}
          modules={filteredIntelligence}
          sizeClasses={sizeClasses}
          delay="0.15s"
        />

        <ModuleSection
          title="Business"
          icon={'\u{1F4BC}'}
          modules={filteredBusiness}
          sizeClasses={sizeClasses}
          delay="0.2s"
        />

        <ModuleSection
          title="Tools"
          icon={'\u{1F6E0}\uFE0F'}
          modules={filteredTools}
          sizeClasses={sizeClasses}
          delay="0.25s"
        />

        {/* No results message */}
        {moduleSearch && totalFilteredModules === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <p className="text-slate-400 text-lg mb-2">No modules match &ldquo;{moduleSearch}&rdquo;</p>
            <button
              onClick={() => setModuleSearch('')}
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Layout Selector Modal */}
      <DashboardLayoutSelector
        isOpen={layoutSelectorOpen}
        onClose={() => setLayoutSelectorOpen(false)}
        onLayoutChange={handleLayoutChange}
      />

      {/* Module Configurator Modal */}
      <ModuleConfigurator
        isOpen={moduleConfigOpen}
        onClose={() => setModuleConfigOpen(false)}
      />
    </div>
  );
}

/** Inline recently viewed list for the dashboard card */
function RecentlyViewedInline() {
  const [items, setItems] = useState<Array<{ path: string; title: string; timestamp: number }>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('spacenexus-recently-viewed');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed.slice(0, 6));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  if (!mounted) {
    return <div className="h-10 bg-white/[0.06] rounded animate-pulse" />;
  }

  if (items.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        Pages you visit will appear here for quick access.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.06] text-xs text-slate-300 hover:text-white hover:border-white/10 hover:bg-white/[0.08] transition-all"
        >
          <svg className="w-3 h-3 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="truncate max-w-[180px]">{item.title}</span>
        </Link>
      ))}
    </div>
  );
}
