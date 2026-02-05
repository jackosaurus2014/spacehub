'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { UserModuleWithConfig } from '@/lib/module-preferences';
import PremiumGate from '@/components/PremiumGate';
import { getRequiredTierForModule } from '@/lib/subscription';
import { MODULE_SECTIONS } from '@/types';
import MissionControlModule from './MissionControlModule';
import BlogsArticlesModule from './BlogsArticlesModule';
import NewsFeedModule from './NewsFeedModule';
import CategoriesModule from './CategoriesModule';
import MarketIntelModule from './MarketIntelModule';
import ResourceExchangeModule from './ResourceExchangeModule';
import BusinessOpportunitiesModule from './BusinessOpportunitiesModule';
import ComplianceModule from './ComplianceModule';
import SolarExplorationModule from './SolarExplorationModule';
import SolarFlareTrackerModule from './SolarFlareTrackerModule';
import OrbitalSlotsModule from './OrbitalSlotsModule';
import SpaceInsuranceModule from './SpaceInsuranceModule';
import SpectrumTrackerModule from './SpectrumTrackerModule';
import SpaceWorkforceModule from './SpaceWorkforceModule';
import LaunchWindowsModule from './LaunchWindowsModule';
import DebrisMonitorModule from './DebrisMonitorModule';
import OrbitalServicesModule from './OrbitalServicesModule';
import ModuleErrorBoundary from './ModuleErrorBoundary';

interface ModuleContainerProps {
  initialModules?: UserModuleWithConfig[];
}

const MODULE_COMPONENTS: Record<string, React.ComponentType> = {
  'mission-control': MissionControlModule,
  'blogs-articles': BlogsArticlesModule,
  'news-feed': NewsFeedModule,
  'categories': CategoriesModule,
  'market-intel': MarketIntelModule,
  'resource-exchange': ResourceExchangeModule,
  'business-opportunities': BusinessOpportunitiesModule,
  'compliance': ComplianceModule,
  'solar-exploration': SolarExplorationModule,
  'solar-flare-tracker': SolarFlareTrackerModule,
  'orbital-slots': OrbitalSlotsModule,
  'space-insurance': SpaceInsuranceModule,
  'spectrum-tracker': SpectrumTrackerModule,
  'space-workforce': SpaceWorkforceModule,
  'launch-windows': LaunchWindowsModule,
  'debris-monitor': DebrisMonitorModule,
  'orbital-services': OrbitalServicesModule,
};

function getTierInfo(moduleId: string): { label: string; color: string; bgColor: string; dotColor: string } {
  const tier = getRequiredTierForModule(moduleId);
  if (tier === 'enterprise') {
    return {
      label: 'Enterprise',
      color: 'text-amber-300',
      bgColor: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/40',
      dotColor: 'bg-amber-400'
    };
  }
  if (tier === 'pro') {
    return {
      label: 'Pro',
      color: 'text-violet-300',
      bgColor: 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 border-violet-500/40',
      dotColor: 'bg-violet-400'
    };
  }
  return {
    label: 'Enthusiast',
    color: 'text-emerald-300',
    bgColor: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/40',
    dotColor: 'bg-emerald-400'
  };
}

export default function ModuleContainer({ initialModules }: ModuleContainerProps) {
  const { data: session } = useSession();
  const [modules, setModules] = useState<UserModuleWithConfig[]>(initialModules || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(!initialModules);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!initialModules) {
      fetchModules();
    }
  }, [session, initialModules]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDropdownOpen) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen, modules.length]);

  const fetchModules = async () => {
    try {
      const res = await fetch('/api/modules');
      const data = await res.json();
      setModules(data.modules || []);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const enabledModules = modules
    .filter(m => m.enabled)
    .sort((a, b) => a.position - b.position);

  const currentModule = enabledModules[currentIndex];
  const Component = currentModule ? MODULE_COMPONENTS[currentModule.moduleId] : null;

  const navigateToModule = useCallback((newIndex: number) => {
    if (newIndex === currentIndex || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setIsTransitioning(false);
    }, 150);
  }, [currentIndex, isTransitioning]);

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : enabledModules.length - 1;
    navigateToModule(newIndex);
  }, [currentIndex, enabledModules.length, navigateToModule]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex < enabledModules.length - 1 ? currentIndex + 1 : 0;
    navigateToModule(newIndex);
  }, [currentIndex, enabledModules.length, navigateToModule]);

  const jumpToModule = (index: number) => {
    navigateToModule(index);
    setIsDropdownOpen(false);
  };

  // Group modules by section for the dropdown
  const groupedModules = MODULE_SECTIONS.map(section => ({
    ...section,
    modules: enabledModules
      .map((m, idx) => ({ ...m, globalIndex: idx }))
      .filter(m => m.section === section.value),
  })).filter(section => section.modules.length > 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
        <p className="text-star-400 text-sm">Loading modules...</p>
      </div>
    );
  }

  if (enabledModules.length === 0) {
    return (
      <div className="card p-12 text-center">
        <span className="text-6xl block mb-6">🛸</span>
        <h3 className="text-2xl font-semibold text-white mb-3">No Modules Available</h3>
        <p className="text-star-300 max-w-md mx-auto">
          Please check back later for available modules.
        </p>
      </div>
    );
  }

  const tierInfo = currentModule ? getTierInfo(currentModule.moduleId) : getTierInfo('');
  const currentSection = MODULE_SECTIONS.find(s => s.value === currentModule?.section);

  return (
    <div className="space-y-8">
      {/* Navigation Header - Sticky */}
      <div className="sticky top-2 z-40">
        <div className="rounded-2xl border border-white/10 bg-space-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Main Navigation Bar */}
          <div className="p-4">
            <div className="flex items-center gap-3">
              {/* Previous Button */}
              <button
                onClick={goToPrevious}
                disabled={isTransitioning}
                className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-star-300 hover:text-white transition-all duration-200 disabled:opacity-50"
                aria-label="Previous module (Left Arrow)"
                title="Previous (←)"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Module Selector */}
              <div className="relative flex-1">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center gap-4 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
                >
                  {/* Module Icon & Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nebula-500/30 to-purple-500/30 flex items-center justify-center text-2xl flex-shrink-0">
                      {currentModule?.icon}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-semibold text-white text-lg truncate">{currentModule?.name}</div>
                      <div className="text-sm text-star-400">{currentSection?.label}</div>
                    </div>
                  </div>

                  {/* Tier Badge & Dropdown Icon */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${tierInfo.bgColor} ${tierInfo.color}`}>
                      {tierInfo.label}
                    </span>
                    <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                      <svg className="w-4 h-4 text-star-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 bg-space-900/98 backdrop-blur-xl shadow-2xl shadow-black/50 max-h-[70vh] overflow-hidden">
                      <div className="overflow-y-auto max-h-[70vh]">
                        {groupedModules.map((section, sectionIdx) => (
                          <div key={section.value}>
                            {/* Section Header */}
                            <div className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-star-500 bg-space-950/80 ${sectionIdx > 0 ? 'border-t border-white/5' : ''}`}>
                              {section.label}
                            </div>
                            {/* Section Modules */}
                            <div className="py-1">
                              {section.modules.map(module => {
                                const moduleTier = getTierInfo(module.moduleId);
                                const isActive = module.globalIndex === currentIndex;
                                return (
                                  <button
                                    key={module.moduleId}
                                    onClick={() => jumpToModule(module.globalIndex)}
                                    className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-all duration-150 ${
                                      isActive
                                        ? 'bg-nebula-500/20 border-l-2 border-l-nebula-400'
                                        : 'hover:bg-white/5 border-l-2 border-l-transparent'
                                    }`}
                                  >
                                    <span className="text-xl w-8 text-center">{module.icon}</span>
                                    <span className={`flex-1 truncate ${isActive ? 'text-white font-medium' : 'text-star-200'}`}>
                                      {module.name}
                                    </span>
                                    <span className={`text-xs font-medium px-2 py-1 rounded border ${moduleTier.bgColor} ${moduleTier.color}`}>
                                      {moduleTier.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Next Button */}
              <button
                onClick={goToNext}
                disabled={isTransitioning}
                className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-star-300 hover:text-white transition-all duration-200 disabled:opacity-50"
                aria-label="Next module (Right Arrow)"
                title="Next (→)"
              >
                <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2">
              {/* Progress Dots */}
              <div className="flex-1 flex items-center justify-center gap-1.5">
                {enabledModules.map((module, idx) => {
                  const dotTier = getTierInfo(module.moduleId);
                  return (
                    <button
                      key={idx}
                      onClick={() => navigateToModule(idx)}
                      className={`rounded-full transition-all duration-300 ${
                        idx === currentIndex
                          ? `w-8 h-2 ${dotTier.dotColor}`
                          : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                      }`}
                      aria-label={`Go to ${module.name}`}
                      title={module.name}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Counter & Legend */}
          <div className="px-4 pb-3 flex items-center justify-between text-xs border-t border-white/5 pt-3">
            <span className="text-star-500">
              {currentIndex + 1} of {enabledModules.length} modules
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-star-500">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Enthusiast
              </span>
              <span className="flex items-center gap-1.5 text-star-500">
                <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                Pro
              </span>
              <span className="flex items-center gap-1.5 text-star-500">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Enterprise
              </span>
            </div>
          </div>
        </div>

        {/* Keyboard Hint */}
        <div className="text-center mt-2">
          <span className="text-xs text-star-600">
            Use <kbd className="px-1.5 py-0.5 rounded bg-space-700 text-star-400 font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-space-700 text-star-400 font-mono text-[10px]">→</kbd> arrow keys to navigate
          </span>
        </div>
      </div>

      {/* Current Module Display */}
      {currentModule && Component && (
        <div
          className={`transition-all duration-200 ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
        >
          <ModuleErrorBoundary moduleName={currentModule.name}>
            <PremiumGate moduleId={currentModule.moduleId}>
              <Component />
            </PremiumGate>
          </ModuleErrorBoundary>
        </div>
      )}
    </div>
  );
}
