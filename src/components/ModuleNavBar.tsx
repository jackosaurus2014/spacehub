'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { MODULE_SECTIONS } from '@/types';
import { getRequiredTierForModule } from '@/lib/subscription';
import { useModuleNavigation } from '@/hooks/useModuleNavigation';

function getTierInfo(moduleId: string) {
  const tier = getRequiredTierForModule(moduleId);
  if (tier === 'enterprise') {
    return { label: 'Enterprise', color: 'text-amber-700', bgColor: 'bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300', dotColor: 'bg-amber-500' };
  }
  if (tier === 'pro') {
    return { label: 'Pro', color: 'text-violet-700', bgColor: 'bg-gradient-to-r from-violet-100 to-purple-100 border-violet-300', dotColor: 'bg-violet-500' };
  }
  return { label: 'Explorer', color: 'text-emerald-700', bgColor: 'bg-gradient-to-r from-emerald-100 to-teal-100 border-emerald-300', dotColor: 'bg-emerald-500' };
}

export default function ModuleNavBar() {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const {
    currentModule,
    prevModule,
    nextModule,
    enabledModules,
    currentIndex,
    isModulePage,
    loaded,
    navigateTo: baseNavigateTo,
  } = useModuleNavigation();

  const navigateTo = useCallback((moduleId: string) => {
    baseNavigateTo(moduleId);
    setIsDropdownOpen(false);
  }, [baseNavigateTo]);

  // Keyboard navigation
  useEffect(() => {
    if (!currentModule || isDropdownOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && prevModule) {
        e.preventDefault();
        navigateTo(prevModule.moduleId);
      } else if (e.key === 'ArrowRight' && nextModule) {
        e.preventDefault();
        navigateTo(nextModule.moduleId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentModule, prevModule, nextModule, isDropdownOpen, navigateTo]);

  // Don't render if not a module page, not loaded, or no current module found
  if (!isModulePage || !loaded || !currentModule || enabledModules.length === 0) {
    return null;
  }

  const tierInfo = getTierInfo(currentModule.moduleId);
  const currentSection = MODULE_SECTIONS.find(s => s.value === currentModule.section);

  const groupedModules = MODULE_SECTIONS.map(section => ({
    ...section,
    modules: enabledModules
      .map((m, idx) => ({ ...m, globalIndex: idx }))
      .filter(m => m.section === section.value),
  })).filter(section => section.modules.length > 0);

  return (
    <div className="sticky top-2 z-40 container mx-auto px-2 sm:px-4 mb-4">
      <div className="rounded-2xl border border-cyan-400/30 backdrop-blur-xl" style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.92) 25%, rgba(51, 65, 85, 0.9) 50%, rgba(30, 41, 59, 0.92) 75%, rgba(15, 23, 42, 0.95) 100%)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)' }}>
        {/* Main Navigation Bar */}
        <div className="p-2 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Previous Button */}
            {prevModule && (
              <button
                onClick={() => navigateTo(prevModule.moduleId)}
                className="group flex items-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-3 rounded-xl bg-gradient-to-r from-cyan-900/60 to-slate-700/60 hover:from-cyan-800/70 hover:to-slate-600/70 border border-cyan-400/30 hover:border-cyan-400/60 text-slate-200 hover:text-cyan-200 transition-all duration-300 shadow-lg shadow-cyan-900/20 hover:shadow-cyan-700/30 hover:scale-[1.03] active:scale-95 touch-target"
                title={`Previous: ${prevModule.name}`}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-1 transition-transform duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-bold tracking-wide">Previous</span>
                  <span className="text-xs text-cyan-400/80 truncate max-w-[140px]">
                    {prevModule.name}
                  </span>
                </div>
              </button>
            )}

            {/* Module Selector */}
            <div className="relative flex-1 min-w-0">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center gap-2 sm:gap-4 px-3 py-2 sm:px-5 sm:py-3 rounded-xl bg-slate-700/40 hover:bg-slate-600/50 border border-cyan-400/20 hover:border-cyan-400/40 transition-all duration-200"
              >
                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-900/50 to-purple-900/50 border border-cyan-400/30 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                    {currentModule.icon}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-slate-100 text-sm sm:text-lg truncate">{currentModule.name}</div>
                    <div className="text-xs sm:text-sm text-slate-400 truncate">{currentSection?.label}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                  <span className={`hidden sm:inline text-xs font-medium px-3 py-1.5 rounded-lg border ${tierInfo.bgColor} ${tierInfo.color}`}>
                    {tierInfo.label}
                  </span>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-700/50 flex items-center justify-center transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-cyan-400/30 backdrop-blur-xl max-h-[70vh] overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 25%, rgba(51, 65, 85, 0.95) 50%, rgba(30, 41, 59, 0.96) 75%, rgba(15, 23, 42, 0.98) 100%)', boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(6, 182, 212, 0.15)' }}>
                    <div className="overflow-y-auto max-h-[70vh]">
                      {groupedModules.map((section, sectionIdx) => (
                        <div key={section.value}>
                          <div className={`px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-slate-800/50 ${sectionIdx > 0 ? 'border-t border-slate-700/50' : ''}`}>
                            {section.label}
                          </div>
                          <div className="py-1">
                            {section.modules.map(module => {
                              const moduleTier = getTierInfo(module.moduleId);
                              const isActive = module.globalIndex === currentIndex;
                              return (
                                <button
                                  key={module.moduleId}
                                  onClick={() => navigateTo(module.moduleId)}
                                  className={`w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 text-left transition-all duration-150 touch-target ${
                                    isActive
                                      ? 'bg-cyan-900/30 border-l-2 border-l-cyan-400'
                                      : 'hover:bg-slate-700/50 border-l-2 border-l-transparent'
                                  }`}
                                >
                                  <span className="text-xl w-8 text-center">{module.icon}</span>
                                  <span className={`flex-1 truncate text-sm sm:text-base ${isActive ? 'text-cyan-300 font-medium' : 'text-slate-300'}`}>
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
            {nextModule && (
              <button
                onClick={() => navigateTo(nextModule.moduleId)}
                className="group flex items-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-3 rounded-xl bg-gradient-to-r from-slate-700/60 to-cyan-900/60 hover:from-slate-600/70 hover:to-cyan-800/70 border border-cyan-400/30 hover:border-cyan-400/60 text-slate-200 hover:text-cyan-200 transition-all duration-300 shadow-lg shadow-cyan-900/20 hover:shadow-cyan-700/30 hover:scale-[1.03] active:scale-95 touch-target"
                title={`Next: ${nextModule.name}`}
              >
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm font-bold tracking-wide">Next</span>
                  <span className="text-xs text-cyan-400/80 truncate max-w-[140px]">
                    {nextModule.name}
                  </span>
                </div>
                <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar (mobile) / Progress Dots (desktop) */}
        <div className="px-3 sm:px-4 pb-2 sm:pb-3">
          {/* Mobile: compact progress bar */}
          <div className="sm:hidden">
            <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getTierInfo(currentModule.moduleId).dotColor}`}
                style={{ width: `${((currentIndex + 1) / enabledModules.length) * 100}%` }}
              />
            </div>
          </div>
          {/* Desktop: progress dots */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap">
              {enabledModules.map((module, idx) => {
                const dotTier = getTierInfo(module.moduleId);
                return (
                  <button
                    key={module.moduleId}
                    onClick={() => navigateTo(module.moduleId)}
                    className={`rounded-full transition-all duration-300 ${
                      idx === currentIndex
                        ? `w-8 h-2 ${dotTier.dotColor}`
                        : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'
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
        <div className="px-3 sm:px-4 pb-2 sm:pb-3 flex items-center justify-between text-xs border-t border-slate-700/50 pt-2 sm:pt-3">
          <span className="text-slate-400">
            {currentIndex + 1} of {enabledModules.length} modules
          </span>
          <div className="hidden sm:flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Explorer
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              Pro
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Enterprise
            </span>
          </div>
          {/* Mobile: compact tier badge */}
          <span className={`sm:hidden text-xs font-medium px-2 py-0.5 rounded border ${tierInfo.bgColor} ${tierInfo.color}`}>
            {tierInfo.label}
          </span>
        </div>
      </div>

      {/* Keyboard Hint — desktop only */}
      <div className="hidden sm:block text-center mt-2">
        <span className="text-xs text-slate-400">
          Use <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 font-mono text-[10px]">←</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 font-mono text-[10px]">→</kbd> arrow keys to navigate modules
        </span>
      </div>
    </div>
  );
}
