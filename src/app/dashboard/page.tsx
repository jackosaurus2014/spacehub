'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayoutSelector from '@/components/DashboardLayoutSelector';
import ModuleConfigurator from '@/components/ModuleConfigurator';
import { SkeletonPage } from '@/components/ui/Skeleton';
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

interface ModuleItem {
  label: string;
  href: string;
  description: string;
  icon: string;
}

const EXPLORE_MODULES: ModuleItem[] = [
  { icon: '🎯', label: 'Mission Control', href: '/mission-control', description: 'Upcoming launches and events' },
  { icon: '📰', label: 'News & Categories', href: '/news', description: 'Latest space industry updates' },
  { icon: '📝', label: 'Blogs & Articles', href: '/blogs', description: 'Expert industry insights' },
  { icon: '🛡️', label: 'Space Defense', href: '/space-defense', description: 'Military space & national security' },
  { icon: '🤖', label: 'AI Insights', href: '/ai-insights', description: 'AI-powered industry analysis' },
  { icon: '🪐', label: 'Solar Exploration', href: '/solar-exploration', description: '3D planetary visualization' },
  { icon: '🔴', label: 'Mars Mission Planner', href: '/mars-planner', description: 'Mars missions and launch windows' },
  { icon: '🌙', label: 'Cislunar Ecosystem', href: '/cislunar', description: 'Gateway, Artemis & lunar economy' },
  { icon: '☄️', label: 'Asteroid Watch', href: '/asteroid-watch', description: 'NEOs, planetary defense, and mining' },
  { icon: '🗺️', label: 'Market Map', href: '/market-map', description: 'Visual industry landscape by sector' },
  { icon: '📚', label: 'Resources & Podcasts', href: '/resources', description: 'Curated content, podcasts & newsletters' },
  { icon: '🔮', label: 'Mission Pipeline', href: '/mission-pipeline', description: 'Upcoming missions 2025-2030' },
  { icon: '📈', label: 'Mission Statistics', href: '/mission-stats', description: 'Launch provider leaderboards & data' },
  { icon: '📑', label: 'Daily Digest', href: '/news-digest', description: 'Quick-scan daily space headlines' },
  { icon: '🌍', label: 'Orbit Guide', href: '/orbit-guide', description: 'Visual guide to orbital mechanics & orbit types' },
  { icon: '🎯', label: 'Career Guide', href: '/career-guide', description: 'Space industry career paths & salary data' },
  { icon: '🔤', label: 'Acronyms', href: '/acronyms', description: 'A-Z space industry acronym reference' },
  { icon: '🏛️', label: 'Space Agencies', href: '/space-agencies', description: 'World space agency profiles & budgets' },
  { icon: '🎙️', label: 'Space Podcasts', href: '/podcasts', description: '25+ space industry podcasts directory' },
  { icon: '🧹', label: 'Debris Remediation', href: '/debris-remediation', description: 'Active debris removal efforts and space sustainability' },
];

const INTELLIGENCE_MODULES: ModuleItem[] = [
  { icon: '📊', label: 'Market Intel', href: '/market-intel', description: 'Companies and stock tracking' },
  { icon: '💹', label: 'Space Economy', href: '/space-economy', description: 'Market size, investment & budgets' },
  { icon: '💸', label: 'Space Capital', href: '/space-capital', description: 'VC investors, startups & matchmaking' },
  { icon: '⚖️', label: 'Regulatory Hub', href: '/compliance', description: 'Compliance, space law & filings' },
  { icon: '⚖️', label: 'Space Law & Treaties', href: '/space-law', description: '20+ international treaties and regulatory frameworks' },
  { icon: '📡', label: 'Spectrum Management', href: '/spectrum', description: 'Allocations, auctions & filings' },
  { icon: '📋', label: 'Patent & IP Tracker', href: '/patents', description: 'Space technology patent trends' },
  { icon: '💰', label: 'Investment Tracker', href: '/investment-tracker', description: 'Funding trends, top deals & investors' },
  { icon: '🏛️', label: 'Government Budgets', href: '/government-budgets', description: 'Global space agency budget tracking' },
  { icon: '📋', label: 'Intelligence Brief', href: '/intelligence-brief', description: 'Weekly curated industry briefing' },
  { icon: '👤', label: 'Executive Moves', href: '/executive-moves', description: 'Leadership changes across the industry' },
  { icon: '🚀', label: 'Startup Tracker', href: '/startup-tracker', description: 'Emerging space companies & funding stages' },
  { icon: '📊', label: 'Report Cards', href: '/report-cards', description: 'Quarterly company performance grades' },
  { icon: '📈', label: 'Industry Trends', href: '/industry-trends', description: 'Data-backed space industry trend analysis' },
];

const BUSINESS_MODULES: ModuleItem[] = [
  { icon: '💼', label: 'Business Opportunities', href: '/business-opportunities', description: 'AI-powered opportunity discovery' },
  { icon: '👥', label: 'Space Talent Hub', href: '/space-talent', description: 'Jobs, experts & workforce analytics' },
  { icon: '🔗', label: 'Global Supply Chain', href: '/supply-chain', description: 'Aerospace supply chain & shortage alerts' },
  { icon: '⛏️', label: 'Space Mining', href: '/space-mining', description: 'Asteroid and planetary mining intelligence' },
  { icon: '🛡️', label: 'Space Insurance', href: '/space-insurance', description: 'Risk calculator and market data' },
  { icon: '🏭', label: 'Manufacturing & Imagery', href: '/space-manufacturing', description: 'In-space manufacturing & EO providers' },
  { icon: '📊', label: 'Deal Flow', href: '/deal-flow', description: 'Investment deals, M&A & partnerships' },
  { icon: '📜', label: 'Contract Awards', href: '/contract-awards', description: 'Government & commercial contract tracker' },
  { icon: '🗺️', label: 'Supply Chain Map', href: '/supply-chain-map', description: 'Interactive supplier relationship map' },
];

const TOOLS_MODULES: ModuleItem[] = [
  { icon: '💰', label: 'Mission Cost Simulator', href: '/mission-cost', description: 'Estimate launch costs and fees' },
  { icon: '🚀', label: 'Launch Vehicle Comparison', href: '/launch-vehicles', description: 'Compare rocket specs and costs' },
  { icon: '🛰️', label: 'Satellite Tracker', href: '/satellites', description: 'Track ISS, Starlink & weather satellites' },
  { icon: '🏗️', label: 'Space Station Tracker', href: '/space-stations', description: 'ISS, Tiangong & commercial stations' },
  { icon: '🌍', label: 'Orbital Management', href: '/orbital-slots', description: 'Orbital slots and satellite services' },
  { icon: '✨', label: 'Constellation Tracker', href: '/constellations', description: 'Satellite constellation monitoring' },
  { icon: '📡', label: 'Ground Stations', href: '/ground-stations', description: 'Global ground station networks' },
  { icon: '🏛️', label: 'Infrastructure Network', href: '/spaceports', description: 'Spaceports & communications networks' },
  { icon: '⚡', label: 'Resource Exchange', href: '/resource-exchange', description: 'Space commodity pricing' },
  { icon: '🗓️', label: 'Launch Windows', href: '/launch-windows', description: 'Optimal launch timing' },
  { icon: '🌤️', label: 'Space Environment', href: '/space-environment', description: 'Weather, debris & operations' },
  { icon: '📐', label: 'Blueprint Series', href: '/blueprints', description: 'Technical hardware breakdowns' },
  { icon: '🧮', label: 'Launch Cost Calculator', href: '/launch-cost-calculator', description: 'Estimate launch costs by vehicle & orbit' },
  { icon: '🔬', label: 'Tech Readiness', href: '/tech-readiness', description: 'Emerging technology TRL tracking' },
  { icon: '🔥', label: 'Propulsion Database', href: '/propulsion-database', description: 'Engine & thruster specifications' },
  { icon: '📍', label: 'Launch Sites', href: '/launch-sites', description: 'Global spaceport database & capabilities' },
  { icon: '📡', label: 'Frequency Bands', href: '/frequency-bands', description: 'Space communications RF spectrum reference' },
  { icon: '🧪', label: 'Materials Database', href: '/materials-database', description: 'Spacecraft materials & properties reference' },
];

function ModuleSection({ title, icon, modules, sizeClasses, delay }: {
  title: string;
  icon: string;
  modules: ModuleItem[];
  sizeClasses: ReturnType<typeof getModuleSizeClasses>;
  delay: string;
}) {
  return (
    <div className={`mb-8 animate-fade-in`} style={{ animationDelay: delay }}>
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className={`group relative bg-slate-800/50 border border-slate-700/50 rounded-xl ${sizeClasses.padding} hover:border-cyan-400/40 hover:bg-slate-800/80 transition-all duration-200`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0 mt-0.5">{mod.icon}</span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors truncate">
                  {mod.label}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                  {mod.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
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

  const handleLayoutChange = () => {
    loadLayout();
  };

  if (status === 'loading' || !layoutLoaded) {
    return <SkeletonPage statCards={4} statGridCols="grid-cols-2 md:grid-cols-4" contentCards={4} contentGridCols="grid-cols-1 md:grid-cols-2" />;
  }

  if (!session) {
    return null;
  }

  const sizeClasses = getModuleSizeClasses(moduleSize);

  const totalModules = EXPLORE_MODULES.length + INTELLIGENCE_MODULES.length + BUSINESS_MODULES.length + TOOLS_MODULES.length;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Control Buttons */}
        <div className="flex justify-end gap-3 mb-4">
          <button
            onClick={() => setModuleConfigOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 hover:border-cyan-400/50 text-cyan-300 hover:text-cyan-200 transition-all text-sm font-medium shadow-sm hover:shadow-md hover:shadow-cyan-500/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure Modules
          </button>
          <button
            onClick={() => setLayoutSelectorOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-cyan-300 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg hover:border-cyan-400/30 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Customize Layout
          </button>
        </div>

        {/* Welcome Header */}
        {isSectionVisible('welcome', sections) && (
          <div className="bg-gradient-to-r from-slate-800/80 via-slate-800/60 to-slate-800/80 border border-slate-700/50 rounded-2xl p-6 mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                  {session.user?.name?.charAt(0)?.toUpperCase() || 'E'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Welcome back, {session.user?.name || 'Explorer'}!
                  </h1>
                  <p className="text-slate-400 text-sm">
                    {session.user?.email}
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-cyan-400">{totalModules}</p>
                  <p className="text-xs text-slate-400">Modules</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">4</p>
                  <p className="text-xs text-slate-400">Categories</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Module Sections - matching sidebar order */}
        <ModuleSection
          title="Explore"
          icon="🔭"
          modules={EXPLORE_MODULES}
          sizeClasses={sizeClasses}
          delay="0.1s"
        />

        <ModuleSection
          title="Intelligence"
          icon="📊"
          modules={INTELLIGENCE_MODULES}
          sizeClasses={sizeClasses}
          delay="0.15s"
        />

        <ModuleSection
          title="Business"
          icon="💼"
          modules={BUSINESS_MODULES}
          sizeClasses={sizeClasses}
          delay="0.2s"
        />

        <ModuleSection
          title="Tools"
          icon="🛠️"
          modules={TOOLS_MODULES}
          sizeClasses={sizeClasses}
          delay="0.25s"
        />
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
