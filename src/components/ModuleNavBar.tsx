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
      <div className="rounded-2xl border border-white/[0.08]" style={{ background: 'rgba(10, 10, 10, 0.95)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 10px 25px -5px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}>
        {/* Main Navigation Bar */}
        <div className="p-2 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Previous Button */}
            {prevModule && (
              <button
                onClick={() => navigateTo(prevModule.moduleId)}
                className="group flex items-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.1] text-white/90 hover:text-white transition-all duration-300 shadow-lg shadow-black/10 hover:shadow-black/15 hover:scale-[1.03] active:scale-95 touch-target"
                title={`Previous: ${prevModule.name}`}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-1 transition-transform duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-bold tracking-wide">Previous</span>
                  <span className="text-xs text-white/70/80 truncate max-w-[140px]">
                    {prevModule.name}
                  </span>
                </div>
              </button>
            )}

            {/* Module Selector */}
            <div className="relative flex-1 min-w-0">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center gap-2 sm:gap-4 px-3 py-2 sm:px-5 sm:py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.1] transition-all duration-200"
              >
                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
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
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.06] flex items-center justify-center transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
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
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/[0.08] max-h-[70vh] overflow-hidden" style={{ background: 'rgba(10, 10, 10, 0.98)', boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <div className="overflow-y-auto max-h-[70vh]">
                      {groupedModules.map((section, sectionIdx) => (
                        <div key={section.value}>
                          <div className={`px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/70 bg-white/[0.03] ${sectionIdx > 0 ? 'border-t border-white/[0.06]' : ''}`}>
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
                                      ? 'bg-white/[0.06] border-l-2 border-l-white/50'
                                      : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
                                  }`}
                                >
                                  <span className="text-xl w-8 text-center">{module.icon}</span>
                                  <span className={`flex-1 truncate text-sm sm:text-base ${isActive ? 'text-white/90 font-medium' : 'text-white/70'}`}>
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
                className="group flex items-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.1] text-white/90 hover:text-white transition-all duration-300 shadow-lg shadow-black/10 hover:shadow-black/15 hover:scale-[1.03] active:scale-95 touch-target"
                title={`Next: ${nextModule.name}`}
              >
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm font-bold tracking-wide">Next</span>
                  <span className="text-xs text-white/70/80 truncate max-w-[140px]">
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
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
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
                        : 'w-2 h-2 bg-white/[0.1] hover:bg-white/[0.15]'
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
        <div className="px-3 sm:px-4 pb-2 sm:pb-3 flex items-center justify-between text-xs border-t border-white/[0.06] pt-2 sm:pt-3">
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
          Use <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-white/70 border border-white/[0.08] font-mono text-xs">←</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-white/70 border border-white/[0.08] font-mono text-xs">→</kbd> arrow keys to navigate modules
        </span>
      </div>
    </div>
  );
}
