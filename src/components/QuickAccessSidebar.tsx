'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PARENT_MODULES, getChildModules } from '@/types';
import { getModuleRoute } from '@/lib/module-routes';
import {
  loadModuleConfig,
  MODULE_CONFIG_CHANGED_EVENT,
  type ModuleConfigState,
} from '@/components/ModuleConfigurator';

const STORAGE_KEY = 'spacenexus-pinned-modules';
const EXPANDED_KEY = 'spacenexus-expanded-parents';

// Fallback: parent modules + standalone modules (no parentModuleId)
const SIDEBAR_TOP_LEVEL_DEFAULT = PARENT_MODULES.filter(m => m.defaultEnabled);

export default function QuickAccessSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pinnedModules, setPinnedModules] = useState<string[]>([]);
  const [expandedParents, setExpandedParents] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [moduleConfig, setModuleConfig] = useState<ModuleConfigState[]>([]);
  const pathname = usePathname();

  // Build the sidebar top-level list based on config
  const buildSidebarModules = useCallback(() => {
    const config = loadModuleConfig();
    setModuleConfig(config);
  }, []);

  // Load state from localStorage
  useEffect(() => {
    const storedPinned = localStorage.getItem(STORAGE_KEY);
    if (storedPinned) {
      try {
        setPinnedModules(JSON.parse(storedPinned));
      } catch {
        setPinnedModules([]);
      }
    }

    const storedExpanded = localStorage.getItem(EXPANDED_KEY);
    if (storedExpanded) {
      try {
        setExpandedParents(JSON.parse(storedExpanded));
      } catch {
        setExpandedParents([]);
      }
    }

    // Load module configuration
    buildSidebarModules();

    setIsHydrated(true);
  }, [buildSidebarModules]);

  // Listen for module config changes from the configurator
  useEffect(() => {
    const handleConfigChange = () => {
      buildSidebarModules();
    };

    window.addEventListener(MODULE_CONFIG_CHANGED_EVENT, handleConfigChange);
    return () => {
      window.removeEventListener(MODULE_CONFIG_CHANGED_EVENT, handleConfigChange);
    };
  }, [buildSidebarModules]);

  // Save pinned modules to localStorage
  const togglePin = (moduleId: string) => {
    const newPinned = pinnedModules.includes(moduleId)
      ? pinnedModules.filter(id => id !== moduleId)
      : [...pinnedModules, moduleId];

    setPinnedModules(newPinned);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPinned));
  };

  // Toggle parent expansion
  const toggleParent = (parentId: string) => {
    const newExpanded = expandedParents.includes(parentId)
      ? expandedParents.filter(id => id !== parentId)
      : [...expandedParents, parentId];

    setExpandedParents(newExpanded);
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(newExpanded));
  };

  // Check if a route is active (for a specific module)
  const isActive = (moduleId: string) => {
    const route = getModuleRoute(moduleId);
    return pathname === route || (route !== '/' && pathname.startsWith(route));
  };

  // Check if any child of a parent is active
  const isParentActive = (parentModule: typeof SIDEBAR_TOP_LEVEL_DEFAULT[0]) => {
    if (!parentModule.isParent || !parentModule.subModuleIds) {
      return isActive(parentModule.moduleId);
    }
    return parentModule.subModuleIds.some(childId => isActive(childId));
  };

  // Build sidebar list from module config (enabled modules in configured order)
  // Falls back to defaults if no config is loaded yet
  const SIDEBAR_TOP_LEVEL = (() => {
    if (moduleConfig.length === 0) return SIDEBAR_TOP_LEVEL_DEFAULT;

    const enabledConfigs = moduleConfig
      .filter(c => c.enabled)
      .sort((a, b) => a.position - b.position);

    return enabledConfigs
      .map(c => PARENT_MODULES.find(m => m.moduleId === c.moduleId))
      .filter((m): m is typeof PARENT_MODULES[0] => m !== undefined);
  })();

  // Sort modules: pinned first, then by configured position
  const sortedModules = [...SIDEBAR_TOP_LEVEL].sort((a, b) => {
    const aPinned = pinnedModules.includes(a.moduleId);
    const bPinned = pinnedModules.includes(b.moduleId);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    // Use configured position from moduleConfig, falling back to defaultPosition
    const aConfig = moduleConfig.find(c => c.moduleId === a.moduleId);
    const bConfig = moduleConfig.find(c => c.moduleId === b.moduleId);
    const aPos = aConfig?.position ?? a.defaultPosition;
    const bPos = bConfig?.position ?? b.defaultPosition;
    return aPos - bPos;
  });

  if (!isHydrated) {
    return null; // Prevent hydration mismatch
  }

  return (
    <>
      {/* Sidebar - hidden on mobile */}
      <aside
        className={`fixed left-0 top-[72px] h-[calc(100vh-72px)] z-[45] hidden lg:flex flex-col transition-all duration-300 ${
          isExpanded ? 'w-72' : 'w-16'
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
        <nav aria-label="Quick access modules" className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {/* Pinned Section Header */}
          {pinnedModules.length > 0 && isExpanded && (
            <div className="px-4 mb-2">
              <span className="text-[10px] uppercase tracking-widest text-cyan-400/60 font-medium">
                Pinned
              </span>
            </div>
          )}

          <ul className="space-y-0.5 px-2">
            {sortedModules.map((module, index) => {
              const isPinned = pinnedModules.includes(module.moduleId);
              const active = module.isParent ? isParentActive(module) : isActive(module.moduleId);
              const hasChildren = module.isParent && module.subModuleIds && module.subModuleIds.length > 0;
              const isParentExpanded = expandedParents.includes(module.moduleId);
              const children = hasChildren ? getChildModules(module.moduleId) : [];
              const showDivider = isExpanded && pinnedModules.length > 0 &&
                index === pinnedModules.filter(id => SIDEBAR_TOP_LEVEL.find(m => m.moduleId === id)).length;

              return (
                <li key={module.moduleId}>
                  {showDivider && (
                    <div className="my-3 border-t border-slate-700/50" />
                  )}
                  <div className="relative group">
                    {/* Parent / standalone module row */}
                    <div className="flex items-center">
                      {hasChildren ? (
                        // Parent module: clicking expands/collapses children
                        <button
                          onClick={() => toggleParent(module.moduleId)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left ${
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
                            className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 flex-1 ${
                              isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                            }`}
                          >
                            {module.name}
                          </span>

                          {/* Chevron for parent modules */}
                          {isExpanded && (
                            <svg
                              className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                                isParentExpanded ? 'rotate-90' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      ) : (
                        // Standalone module: clicking navigates
                        <Link
                          href={getModuleRoute(module.moduleId)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full ${
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
                      )}

                      {/* Pin Button (only when expanded, for non-parent modules) */}
                      {isExpanded && !hasChildren && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePin(module.moduleId);
                          }}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all duration-200 ${
                            isPinned
                              ? 'text-cyan-400 hover:text-cyan-300'
                              : 'text-slate-400 hover:text-slate-300 opacity-0 group-hover:opacity-100'
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
                    </div>

                    {/* Tooltip (only when collapsed) */}
                    {!isExpanded && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 rounded-lg bg-slate-800 border border-cyan-400/30 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
                        <span className="text-sm text-slate-200 font-medium">{module.name}</span>
                        {module.isPremium && (
                          <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            PRO
                          </span>
                        )}
                        {hasChildren && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-700/50">
                            {children.filter(c => c.defaultEnabled).map(child => (
                              <Link
                                key={child.moduleId}
                                href={getModuleRoute(child.moduleId)}
                                className="block text-xs text-slate-400 hover:text-cyan-300 py-0.5 transition-colors"
                              >
                                {child.icon} {child.name}
                              </Link>
                            ))}
                          </div>
                        )}
                        {/* Tooltip arrow */}
                        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-b border-cyan-400/30 rotate-45" />
                      </div>
                    )}
                  </div>

                  {/* Children (expanded sub-modules) */}
                  {hasChildren && isExpanded && isParentExpanded && (
                    <ul className="ml-5 pl-4 border-l border-slate-700/40 mt-0.5 mb-1 space-y-0.5">
                      {children.filter(c => c.defaultEnabled).map(child => {
                        const childActive = isActive(child.moduleId);
                        return (
                          <li key={child.moduleId}>
                            <Link
                              href={getModuleRoute(child.moduleId)}
                              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200 text-sm ${
                                childActive
                                  ? 'bg-cyan-500/15 text-cyan-300'
                                  : 'text-slate-400 hover:bg-slate-700/40 hover:text-cyan-300'
                              }`}
                            >
                              <span className="text-sm flex-shrink-0 w-5 text-center" role="img" aria-label={child.name}>
                                {child.icon}
                              </span>
                              <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                                {child.name}
                              </span>
                              {child.isPremium && (
                                <span className="ml-auto text-[9px] font-semibold px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-400/70 border border-cyan-500/20 flex-shrink-0">
                                  PRO
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className="p-2 border-t border-slate-700/50 space-y-0.5">
          <Link
            href="/blog"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              pathname?.startsWith('/blog')
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300'
            }`}
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </span>
            <span
              className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}
            >
              SpaceNexus Blog
            </span>
          </Link>
          <Link
            href="/ai-insights"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              pathname?.startsWith('/ai-insights')
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300'
            }`}
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </span>
            <span
              className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}
            >
              AI Insights
            </span>
          </Link>
          <Link
            href="/marketplace"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              pathname?.startsWith('/marketplace') || pathname?.startsWith('/provider-dashboard')
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300'
            }`}
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">🏪</span>
            <span
              className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}
            >
              Marketplace
            </span>
          </Link>
          <Link
            href="/deal-rooms"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              pathname?.startsWith('/deal-rooms')
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300'
            }`}
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <span
              className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}
            >
              Deal Room
            </span>
          </Link>
          <Link
            href="/funding-opportunities"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              pathname?.startsWith('/funding-opportunities')
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300'
            }`}
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">💰</span>
            <span
              className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}
            >
              Funding
            </span>
          </Link>
          <Link
            href="/customer-discovery"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              pathname?.startsWith('/customer-discovery')
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300'
            }`}
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <span
              className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}
            >
              Customers
            </span>
          </Link>
          <Link
            href="/my-watchlists"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              pathname === '/my-watchlists'
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-300'
            }`}
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">&#x2605;</span>
            <span
              className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}
            >
              Watchlists
            </span>
          </Link>
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
