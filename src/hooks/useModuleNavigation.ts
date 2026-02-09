'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MODULE_ROUTES } from '@/lib/module-routes';

export interface ModuleInfo {
  moduleId: string;
  name: string;
  icon: string;
  section: string;
  enabled: boolean;
  position: number;
}

// Build a reverse lookup: route path → moduleId
const ROUTE_TO_MODULE: Record<string, string> = {};
for (const [moduleId, route] of Object.entries(MODULE_ROUTES)) {
  if (!ROUTE_TO_MODULE[route]) {
    ROUTE_TO_MODULE[route] = moduleId;
  }
}

// Pages where module navigation should NOT be active
const EXCLUDED_PATHS = new Set([
  '/', '/pricing', '/about', '/contact', '/faq', '/login', '/register',
  '/forgot-password', '/reset-password', '/verify-email', '/dashboard',
  '/admin', '/search', '/live', '/cookies', '/privacy', '/terms',
]);

export interface UseModuleNavigationResult {
  currentModule: ModuleInfo | null;
  prevModule: ModuleInfo | null;
  nextModule: ModuleInfo | null;
  enabledModules: ModuleInfo[];
  currentIndex: number;
  isModulePage: boolean;
  loaded: boolean;
  navigateTo: (moduleId: string) => void;
}

/**
 * Shared hook for module navigation logic.
 * Fetches enabled modules, determines current/prev/next, and provides navigateTo().
 * Used by ModuleNavBar, SwipeModuleNavigation, and MobileTabBar.
 */
export function useModuleNavigation(): UseModuleNavigationResult {
  const pathname = usePathname();
  const router = useRouter();
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  const isModulePage = !EXCLUDED_PATHS.has(pathname);

  useEffect(() => {
    if (!isModulePage) return;

    const fetchModules = async () => {
      try {
        const res = await fetch('/api/modules');
        const data = await res.json();
        setModules(data.modules || []);
      } catch {
        // Silently fail
      } finally {
        setLoaded(true);
      }
    };

    fetchModules();
  }, [isModulePage]);

  const enabledModules = useMemo(() =>
    modules.filter(m => m.enabled).sort((a, b) => a.position - b.position),
    [modules]
  );

  const currentIndex = useMemo(() => {
    const currentModuleId = ROUTE_TO_MODULE[pathname];
    if (!currentModuleId) return -1;
    return enabledModules.findIndex(m => {
      if (m.moduleId === currentModuleId) return true;
      const route = MODULE_ROUTES[m.moduleId];
      return route === pathname;
    });
  }, [pathname, enabledModules]);

  const currentModule = currentIndex >= 0 ? enabledModules[currentIndex] : null;
  const prevModule = enabledModules.length > 0 && currentIndex >= 0
    ? enabledModules[currentIndex > 0 ? currentIndex - 1 : enabledModules.length - 1]
    : null;
  const nextModule = enabledModules.length > 0 && currentIndex >= 0
    ? enabledModules[currentIndex < enabledModules.length - 1 ? currentIndex + 1 : 0]
    : null;

  const navigateTo = useCallback((moduleId: string) => {
    const route = MODULE_ROUTES[moduleId] || '/dashboard';
    router.push(route);
  }, [router]);

  return {
    currentModule,
    prevModule,
    nextModule,
    enabledModules,
    currentIndex,
    isModulePage,
    loaded,
    navigateTo,
  };
}

// Re-export for external use
export { ROUTE_TO_MODULE, EXCLUDED_PATHS };
