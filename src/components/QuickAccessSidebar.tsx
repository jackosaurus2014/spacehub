'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AVAILABLE_MODULES, ModuleConfig } from '@/types';

const STORAGE_KEY = 'spacenexus-pinned-modules';

// Map moduleId to route path
const MODULE_ROUTES: Record<string, string> = {
  'mission-control': '/mission-control',
  'categories': '/news',
  'news-feed': '/news',
  'solar-exploration': '/solar-exploration',
  'market-intel': '/market-intel',
  'blogs-articles': '/blogs',
  'business-opportunities': '/business-opportunities',
  'spectrum-tracker': '/spectrum-tracker',
  'space-insurance': '/space-insurance',
  'space-workforce': '/space-workforce',
  'orbital-services': '/orbital-services',
  'orbital-slots': '/orbital-slots',
  'resource-exchange': '/resource-exchange',
  'compliance': '/compliance',
  'solar-flare-tracker': '/solar-flares',
  'launch-windows': '/launch-windows',
  'debris-monitor': '/debris-monitor',
};

// Filter out disabled modules
const SIDEBAR_MODULES = AVAILABLE_MODULES.filter(m => m.defaultEnabled);

export default function QuickAccessSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pinnedModules, setPinnedModules] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const pathname = usePathname();

  // Load pinned modules from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPinnedModules(JSON.parse(stored));
      } catch {
        setPinnedModules([]);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save pinned modules to localStorage
  const togglePin = (moduleId: string) => {
    const newPinned = pinnedModules.includes(moduleId)
      ? pinnedModules.filter(id => id !== moduleId)
      : [...pinnedModules, moduleId];

    setPinnedModules(newPinned);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPinned));
  };

  // Sort modules: pinned first, then by position
  const sortedModules = [...SIDEBAR_MODULES].sort((a, b) => {
    const aPinned = pinnedModules.includes(a.moduleId);
    const bPinned = pinnedModules.includes(b.moduleId);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return a.defaultPosition - b.defaultPosition;
  });

  const getModuleRoute = (moduleId: string) => MODULE_ROUTES[moduleId] || '/dashboard';

  const isActive = (moduleId: string) => {
    const route = getModuleRoute(moduleId);
    return pathname === route || (route !== '/' && pathname.startsWith(route));
  };

  if (!isHydrated) {
    return null; // Prevent hydration mismatch
  }

  return (
    <>
      {/* Sidebar - hidden on mobile */}
      <aside
        className={`fixed left-0 top-[72px] h-[calc(100vh-72px)] z-40 hidden lg:flex flex-col transition-all duration-300 ${
          isExpanded ? 'w-64' : 'w-16'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 50%, rgba(15, 23, 42, 0.98) 100%)',
          boxShadow: '4px 0 16px -4px rgba(0, 0, 0, 0.4), inset -1px 0 0 rgba(6, 182, 212, 0.15)',
        }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-4 w-6 h-6 rounded-full bg-slate-800 border border-cyan-400/30 flex items-center justify-center text-cyan-400 hover:text-cyan-300 hover:border-cyan-400/50 transition-colors shadow-lg"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <svg
            className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Modules List */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {/* Pinned Section Header */}
          {pinnedModules.length > 0 && isExpanded && (
            <div className="px-4 mb-2">
              <span className="text-[10px] uppercase tracking-widest text-cyan-400/60 font-medium">
                Pinned
              </span>
            </div>
          )}

          <ul className="space-y-1 px-2">
            {sortedModules.map((module, index) => {
              const isPinned = pinnedModules.includes(module.moduleId);
              const active = isActive(module.moduleId);
              const showDivider = isExpanded && pinnedModules.length > 0 &&
                index === pinnedModules.filter(id => SIDEBAR_MODULES.find(m => m.moduleId === id)).length;

              return (
                <li key={module.moduleId}>
                  {showDivider && (
                    <div className="my-3 border-t border-slate-700/50" />
                  )}
                  <div className="relative group">
                    <Link
                      href={getModuleRoute(module.moduleId)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        active
                          ? 'bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/10'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300'
                      }`}
                    >
                      {/* Icon */}
                      <span className="text-lg flex-shrink-0 w-6 text-center" role="img" aria-label={module.name}>
                        {module.icon}
                      </span>

                      {/* Name (only when expanded) */}
                      <span
                        className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                          isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                        }`}
                      >
                        {module.name}
                      </span>

                      {/* Premium Badge */}
                      {module.isPremium && isExpanded && (
                        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
                          PRO
                        </span>
                      )}
                    </Link>

                    {/* Pin Button (only when expanded) */}
                    {isExpanded && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          togglePin(module.moduleId);
                        }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all duration-200 ${
                          isPinned
                            ? 'text-cyan-400 hover:text-cyan-300'
                            : 'text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100'
                        }`}
                        aria-label={isPinned ? 'Unpin module' : 'Pin module'}
                        style={{ right: module.isPremium ? '48px' : '8px' }}
                      >
                        <svg
                          className="w-4 h-4"
                          fill={isPinned ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                          />
                        </svg>
                      </button>
                    )}

                    {/* Tooltip (only when collapsed) */}
                    {!isExpanded && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 rounded-lg bg-slate-800 border border-cyan-400/30 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
                        <span className="text-sm text-slate-200 font-medium">{module.name}</span>
                        {module.isPremium && (
                          <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            PRO
                          </span>
                        )}
                        {/* Tooltip arrow */}
                        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-b border-cyan-400/30 rotate-45" />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className="p-2 border-t border-slate-700/50">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              pathname === '/dashboard'
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300'
            }`}
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </span>
            <span
              className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}
            >
              Dashboard
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
