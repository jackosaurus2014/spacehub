'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { AVAILABLE_MODULES } from '@/types';
import { MODULE_ROUTES } from '@/lib/module-routes';

export interface TabItem {
  id: string;
  name: string;
  icon: string;
  href: string;
  badge?: number;
}

const DEFAULT_TABS: TabItem[] = [
  { id: 'home', name: 'Home', icon: '🏠', href: '/' },
  { id: 'news', name: 'News', icon: '📰', href: '/news' },
  { id: 'events', name: 'Events', icon: '🚀', href: '/mission-control' },
  { id: 'dashboard', name: 'Dashboard', icon: '📊', href: '/dashboard' },
];

// Build reverse lookup: route path → moduleId
const ROUTE_TO_MODULE: Record<string, string> = {};
for (const [moduleId, route] of Object.entries(MODULE_ROUTES)) {
  if (!ROUTE_TO_MODULE[route]) {
    ROUTE_TO_MODULE[route] = moduleId;
  }
}

export interface UseContextualTabsResult {
  tabs: TabItem[];
  isContextual: boolean;
  parentName: string | null;
  parentHref: string | null;
}

/**
 * Returns contextual tabs based on the current route.
 * When inside a parent module's section, returns sub-module tabs.
 * Otherwise returns the default 5 tabs.
 */
export function useContextualTabs(): UseContextualTabsResult {
  const pathname = usePathname();

  return useMemo(() => {
    // Find which module the current path belongs to
    const currentModuleId = ROUTE_TO_MODULE[pathname];
    if (!currentModuleId) {
      return { tabs: DEFAULT_TABS, isContextual: false, parentName: null, parentHref: null };
    }

    // Find the module config
    const currentModule = AVAILABLE_MODULES.find(m => m.moduleId === currentModuleId);
    if (!currentModule) {
      return { tabs: DEFAULT_TABS, isContextual: false, parentName: null, parentHref: null };
    }

    // Determine the parent module
    let parentModule;
    if (currentModule.isParent) {
      parentModule = currentModule;
    } else if (currentModule.parentModuleId) {
      parentModule = AVAILABLE_MODULES.find(m => m.moduleId === currentModule.parentModuleId);
    }

    // If no parent found or parent has no sub-modules, use defaults
    if (!parentModule || !parentModule.subModuleIds || parentModule.subModuleIds.length <= 1) {
      return { tabs: DEFAULT_TABS, isContextual: false, parentName: null, parentHref: null };
    }

    // Build contextual tabs from sub-modules
    const contextualTabs: TabItem[] = parentModule.subModuleIds
      .map(subId => {
        const subModule = AVAILABLE_MODULES.find(m => m.moduleId === subId);
        if (!subModule) return null;
        const href = MODULE_ROUTES[subId];
        if (!href) return null;
        return {
          id: subId,
          name: subModule.name.length > 12 ? subModule.name.split(' ').slice(0, 2).join(' ') : subModule.name,
          icon: subModule.icon,
          href,
        };
      })
      .filter((tab): tab is TabItem => tab !== null)
      .slice(0, 5); // Max 5 tabs to fit in bottom bar

    const parentHref = MODULE_ROUTES[parentModule.moduleId] || null;

    if (contextualTabs.length < 2) {
      return { tabs: DEFAULT_TABS, isContextual: false, parentName: null, parentHref: null };
    }

    return {
      tabs: contextualTabs,
      isContextual: true,
      parentName: parentModule.name,
      parentHref,
    };
  }, [pathname]);
}
