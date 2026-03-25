'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import RelatedModules from '@/components/ui/RelatedModules';

// ════════════════════════════════════════
// Dynamic Tab Imports (code-split per tab)
// ════════════════════════════════════════

const TabSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div
      className="w-10 h-10 border-3 border-white/15 border-t-transparent rounded-full animate-spin"
      style={{ borderWidth: '3px' }}
    />
  </div>
);

const SpaceWeatherTab = dynamic(() => import('./_components/SpaceWeatherTab'), {
  loading: TabSpinner,
  ssr: false,
});

const DebrisTrackingTab = dynamic(() => import('./_components/DebrisTrackingTab'), {
  loading: TabSpinner,
  ssr: false,
});

const OperationsTab = dynamic(() => import('./_components/OperationsTab'), {
  loading: TabSpinner,
  ssr: false,
});

// ════════════════════════════════════════
// Top-Level Tab Type & Config
// ════════════════════════════════════════

type MainTab = 'weather' | 'debris' | 'operations';

const MAIN_TABS: { id: MainTab; label: string; description: string }[] = [
  { id: 'weather', label: 'Space Weather', description: 'Solar activity monitoring & forecasts' },
  { id: 'debris', label: 'Debris Tracking', description: 'Orbital debris & collision risk' },
  { id: 'operations', label: 'Operations', description: 'Conjunction monitoring & sustainability' },
];

// ════════════════════════════════════════
// Shell Component (tab routing only)
// ════════════════════════════════════════

function SpaceEnvironmentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get('tab') as MainTab | null;
  const initialTab: MainTab = (tabParam && ['weather', 'debris', 'operations'].includes(tabParam))
    ? tabParam
    : 'weather';

  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = useCallback((tab: MainTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'weather') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  useSwipeTabs(
    ['weather', 'debris', 'operations'],
    activeTab,
    (tab) => handleTabChange(tab as MainTab)
  );

  return (
    <PullToRefresh onRefresh={async () => { setRefreshKey((k) => k + 1); }}>
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/art/hero-space-environment.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />
        </div>
        <div className="container mx-auto px-4 pt-6">
          <AnimatedPageHeader
            title="Space Environment Monitor"
            subtitle="Unified dashboard for space weather, orbital debris tracking, and operational awareness"
            icon="☀️"
            accentColor="red"
          />
        </div>
      </div>

      <div className="container mx-auto px-4">

        {/* Main Tab Navigation */}
        <div role="tablist" className="flex gap-1 mb-8 p-1 bg-white/[0.04] rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-thin">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap touch-target ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900'
                  : 'text-slate-400 hover:text-white/90 hover:bg-white/[0.08]'
              }`}
            >
              <div className="text-sm font-semibold">{tab.label}</div>
              <div className={`text-xs mt-0.5 hidden sm:block ${activeTab === tab.id ? 'text-white/70' : 'text-slate-500'}`}>
                {tab.description}
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'weather' && <SpaceWeatherTab key={`weather-${refreshKey}`} />}
        {activeTab === 'debris' && <DebrisTrackingTab key={`debris-${refreshKey}`} />}
        {activeTab === 'operations' && <OperationsTab key={`operations-${refreshKey}`} />}

        <RelatedModules modules={[
          { name: 'Satellite Tracker', description: 'Real-time satellite positions', href: '/satellites', icon: '\u{1F6F0}\u{FE0F}' },
          { name: 'Mission Control', description: 'Upcoming launches and events', href: '/mission-control', icon: '\u{1F680}' },
          { name: 'Asteroid Watch', description: 'Near-Earth object tracking', href: '/asteroid-watch', icon: '\u{2604}\u{FE0F}' },
        ]} />
      </div>
    </div>
    </PullToRefresh>
  );
}

// ════════════════════════════════════════
// Default Export (Suspense boundary)
// ════════════════════════════════════════

export default function SpaceEnvironmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-20">
          <div
            className="w-12 h-12 border-3 border-white/15 border-t-transparent rounded-full animate-spin"
            style={{ borderWidth: '3px' }}
          />
        </div>
      }
    >
      <SpaceEnvironmentContent />
    </Suspense>
  );
}
