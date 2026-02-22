'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardBuilder, { type WidgetData } from '@/components/dashboard/DashboardBuilder';
import LayoutSelector from '@/components/dashboard/LayoutSelector';
import { DEFAULT_LAYOUTS, type LayoutPreset } from '@/lib/dashboard/default-layouts';
import {
  getLocalLayouts,
  getDefaultLocalLayout,
  createLocalLayout,
  updateLocalLayout,
  deleteLocalLayout,
  type LocalLayout,
} from '@/lib/dashboard/local-storage';
import { SkeletonPage } from '@/components/ui/Skeleton';

interface ApiLayout {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  isPublic: boolean;
  gridColumns: number;
  widgets: ApiWidget[];
  createdAt: string;
  updatedAt: string;
}

interface ApiWidget {
  id: string;
  moduleId: string;
  widgetType: string;
  title?: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  config?: Record<string, unknown> | null;
  order: number;
}

/**
 * Dashboard Builder page.
 * Supports both authenticated (DB-backed) and anonymous (localStorage) users.
 */
export default function DashboardBuilderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);

  // Layout state
  const [layouts, setLayouts] = useState<(ApiLayout | LocalLayout)[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);
  const [activeWidgets, setActiveWidgets] = useState<WidgetData[]>([]);
  const [tier, setTier] = useState<string>('free');
  const [layoutLimit, setLayoutLimit] = useState<number>(0);

  // Track original widgets for change detection
  const originalWidgetsRef = useRef<string>('');

  const isAuthenticated = status === 'authenticated';
  const useLocalStorage = !isAuthenticated || tier === 'free';

  const loadLocalLayouts = useCallback(() => {
    const localLayouts = getLocalLayouts();
    setLayouts(localLayouts);

    const defaultLayout = getDefaultLocalLayout();
    if (defaultLayout) {
      setActiveLayoutId(defaultLayout.id);
      setActiveWidgets(mapToWidgetData(defaultLayout.widgets));
      originalWidgetsRef.current = JSON.stringify(defaultLayout.widgets);
    }
  }, []);

  // Load layouts on mount
  useEffect(() => {
    const loadLayouts = async () => {
      setLoading(true);

      if (isAuthenticated) {
        try {
          const res = await fetch('/api/dashboard/layouts');
          if (res.ok) {
            const json = await res.json();
            const data = json.data;
            setTier(data.tier || 'free');
            setLayoutLimit(data.limit || 0);

            if (data.tier === 'free' || data.layouts.length === 0) {
              // Free tier: use localStorage
              loadLocalLayouts();
            } else {
              // Pro/Enterprise: use DB layouts
              setLayouts(data.layouts);
              const defaultLayout = data.layouts.find((l: ApiLayout) => l.isDefault) || data.layouts[0];
              if (defaultLayout) {
                setActiveLayoutId(defaultLayout.id);
                setActiveWidgets(mapToWidgetData(defaultLayout.widgets));
                originalWidgetsRef.current = JSON.stringify(defaultLayout.widgets);
              }
            }
          } else {
            loadLocalLayouts();
          }
        } catch {
          loadLocalLayouts();
        }
      } else {
        loadLocalLayouts();
      }

      setLoading(false);
    };

    if (status !== 'loading') {
      loadLayouts();
    }
  }, [status, isAuthenticated, loadLocalLayouts]);

  // Map API/local widgets to WidgetData format
  function mapToWidgetData(widgets: (ApiWidget | LocalLayout['widgets'][0])[]): WidgetData[] {
    return widgets.map((w) => ({
      id: w.id,
      moduleId: w.moduleId,
      widgetType: w.widgetType,
      title: 'title' in w ? w.title : undefined,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: w.minW,
      minH: w.minH,
      config: 'config' in w ? (w.config as Record<string, unknown> | null) : undefined,
      order: w.order,
    }));
  }

  // Handle saving widgets
  const handleSave = useCallback(
    async (widgets: WidgetData[]) => {
      if (!activeLayoutId) return;

      if (useLocalStorage) {
        const localWidgets = widgets.map((w) => ({
          id: w.id,
          moduleId: w.moduleId,
          widgetType: w.widgetType,
          title: w.title ?? undefined,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          minW: w.minW,
          minH: w.minH,
          config: w.config ? (w.config as Record<string, unknown>) : undefined,
          order: w.order,
        }));

        updateLocalLayout(activeLayoutId, { widgets: localWidgets });
        loadLocalLayouts();
      } else {
        // Save to API
        try {
          const apiWidgets = widgets.map((w) => ({
            moduleId: w.moduleId,
            widgetType: w.widgetType,
            title: w.title,
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
            minW: w.minW,
            minH: w.minH,
            config: w.config,
            order: w.order,
          }));

          await fetch(`/api/dashboard/layouts/${activeLayoutId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ widgets: apiWidgets }),
          });

          // Reload layouts
          const res = await fetch('/api/dashboard/layouts');
          if (res.ok) {
            const json = await res.json();
            setLayouts(json.data.layouts);
          }
        } catch {
          // Silently fail - could show toast
        }
      }

      setActiveWidgets(widgets);
      originalWidgetsRef.current = JSON.stringify(widgets);
      setHasChanges(false);
      setIsEditing(false);
    },
    [activeLayoutId, useLocalStorage, loadLocalLayouts]
  );

  // Handle edit toggle
  const handleToggleEdit = useCallback(() => {
    if (isEditing) {
      // Cancel editing: restore original widgets
      const layout = layouts.find((l) => l.id === activeLayoutId);
      if (layout && 'widgets' in layout) {
        setActiveWidgets(mapToWidgetData(layout.widgets));
      }
      setHasChanges(false);
    }
    setIsEditing(!isEditing);
  }, [isEditing, layouts, activeLayoutId]);

  // Handle layout selection
  const handleSelectLayout = useCallback(
    (layoutId: string) => {
      const layout = layouts.find((l) => l.id === layoutId);
      if (layout && 'widgets' in layout) {
        setActiveLayoutId(layoutId);
        setActiveWidgets(mapToWidgetData(layout.widgets));
        originalWidgetsRef.current = JSON.stringify(layout.widgets);
        setHasChanges(false);
        setIsEditing(false);
      }
      setShowLayoutSelector(false);
    },
    [layouts]
  );

  // Handle creating from preset
  const handleCreateFromPreset = useCallback(
    async (preset: LayoutPreset) => {
      const presetWidgets = preset.widgets.map((w, index) => ({
        moduleId: w.moduleId,
        widgetType: w.widgetType,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: 3,
        minH: 2,
        order: index,
      }));

      if (useLocalStorage) {
        const newLayout = createLocalLayout(preset.name, preset.description, presetWidgets);
        if (newLayout) {
          loadLocalLayouts();
          setActiveLayoutId(newLayout.id);
          setActiveWidgets(mapToWidgetData(newLayout.widgets));
        }
      } else {
        try {
          const res = await fetch('/api/dashboard/layouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: preset.name,
              description: preset.description,
              widgets: presetWidgets,
            }),
          });

          if (res.ok) {
            const json = await res.json();
            const newLayout = json.data;
            setLayouts((prev) => [newLayout, ...prev]);
            setActiveLayoutId(newLayout.id);
            setActiveWidgets(mapToWidgetData(newLayout.widgets));
          }
        } catch {
          // Silently fail
        }
      }

      setShowLayoutSelector(false);
    },
    [useLocalStorage, loadLocalLayouts]
  );

  // Handle creating blank layout
  const handleCreateBlank = useCallback(async () => {
    if (useLocalStorage) {
      const newLayout = createLocalLayout('My Dashboard', 'Custom dashboard layout', []);
      if (newLayout) {
        loadLocalLayouts();
        setActiveLayoutId(newLayout.id);
        setActiveWidgets([]);
        setIsEditing(true);
      }
    } else {
      try {
        const res = await fetch('/api/dashboard/layouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'My Dashboard',
            description: 'Custom dashboard layout',
            widgets: [],
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const newLayout = json.data;
          setLayouts((prev) => [newLayout, ...prev]);
          setActiveLayoutId(newLayout.id);
          setActiveWidgets([]);
          setIsEditing(true);
        }
      } catch {
        // Silently fail
      }
    }

    setShowLayoutSelector(false);
  }, [useLocalStorage, loadLocalLayouts]);

  // Handle deleting layout
  const handleDeleteLayout = useCallback(
    async (layoutId: string) => {
      if (useLocalStorage) {
        deleteLocalLayout(layoutId);
        const remaining = getLocalLayouts();
        setLayouts(remaining);

        if (layoutId === activeLayoutId) {
          if (remaining.length > 0) {
            setActiveLayoutId(remaining[0].id);
            setActiveWidgets(mapToWidgetData(remaining[0].widgets));
          } else {
            setActiveLayoutId(null);
            setActiveWidgets([]);
          }
        }
      } else {
        try {
          await fetch(`/api/dashboard/layouts/${layoutId}`, {
            method: 'DELETE',
          });

          setLayouts((prev) => prev.filter((l) => l.id !== layoutId));

          if (layoutId === activeLayoutId) {
            const remaining = layouts.filter((l) => l.id !== layoutId);
            if (remaining.length > 0) {
              handleSelectLayout(remaining[0].id);
            } else {
              setActiveLayoutId(null);
              setActiveWidgets([]);
            }
          }
        } catch {
          // Silently fail
        }
      }
    },
    [useLocalStorage, activeLayoutId, layouts, handleSelectLayout]
  );

  // Handle setting default
  const handleSetDefault = useCallback(
    async (layoutId: string) => {
      if (useLocalStorage) {
        updateLocalLayout(layoutId, { isDefault: true });
        loadLocalLayouts();
      } else {
        try {
          await fetch(`/api/dashboard/layouts/${layoutId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDefault: true }),
          });

          setLayouts((prev) =>
            prev.map((l) => ({
              ...l,
              isDefault: l.id === layoutId,
            }))
          );
        } catch {
          // Silently fail
        }
      }
    },
    [useLocalStorage, loadLocalLayouts]
  );

  // Show loading skeleton
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <SkeletonPage
            statCards={3}
            statGridCols="grid-cols-3"
            contentCards={4}
            contentGridCols="grid-cols-1 md:grid-cols-2"
          />
        </div>
      </div>
    );
  }

  // Map layouts for LayoutSelector
  const layoutsForSelector = layouts.map((l) => ({
    id: l.id,
    name: l.name,
    description: 'description' in l ? l.description : undefined,
    isDefault: l.isDefault,
    widgetCount: 'widgets' in l ? l.widgets.length : 0,
    updatedAt: 'updatedAt' in l ? String(l.updatedAt) : new Date().toISOString(),
  }));

  const canCreateMore = useLocalStorage
    ? layouts.length < 1
    : layoutLimit === 0 || layouts.length < layoutLimit;

  const activeLayoutName = layouts.find((l) => l.id === activeLayoutId)?.name || 'Dashboard Builder';

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-slate-400 hover:text-slate-600 p-1"
              title="Back to Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{activeLayoutName}</h1>
              <p className="text-sm text-slate-500">
                {useLocalStorage ? 'Saved locally' : `${tier} tier`}
                {' | '}
                {activeWidgets.length} widget{activeWidgets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLayoutSelector(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-cyan-400/50 hover:bg-cyan-50/20 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Layouts
          </button>
        </div>

        {/* Onboarding: no layouts exist */}
        {layouts.length === 0 && !activeLayoutId && (
          <div className="card p-8 text-center mb-6">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Build Your Dashboard</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
              Create a personalized dashboard with widgets from any SpaceNexus module.
              Start from a template or build from scratch.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {DEFAULT_LAYOUTS.slice(0, 2).map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handleCreateFromPreset(preset)}
                  className="px-5 py-3 rounded-xl border border-slate-200 hover:border-cyan-400/50 hover:bg-cyan-50/20 transition-all text-left max-w-xs"
                >
                  <p className="text-sm font-semibold text-slate-900">{preset.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{preset.description}</p>
                </button>
              ))}
              <button
                onClick={handleCreateBlank}
                className="px-5 py-3 rounded-xl border border-dashed border-slate-300 hover:border-cyan-400/50 hover:bg-cyan-50/20 transition-all"
              >
                <p className="text-sm font-semibold text-slate-900">Blank Dashboard</p>
                <p className="text-xs text-slate-500 mt-0.5">Start from scratch</p>
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Builder */}
        {activeLayoutId && (
          <DashboardBuilder
            widgets={activeWidgets}
            isEditing={isEditing}
            onSave={handleSave}
            onToggleEdit={handleToggleEdit}
            hasChanges={hasChanges}
          />
        )}

        {/* Layout Selector Modal */}
        <LayoutSelector
          isOpen={showLayoutSelector}
          onClose={() => setShowLayoutSelector(false)}
          layouts={layoutsForSelector}
          activeLayoutId={activeLayoutId}
          onSelectLayout={handleSelectLayout}
          onCreateFromPreset={handleCreateFromPreset}
          onCreateBlank={handleCreateBlank}
          onDeleteLayout={handleDeleteLayout}
          onSetDefault={handleSetDefault}
          canCreate={canCreateMore}
          tier={tier}
          layoutLimit={layoutLimit}
        />
      </div>
    </div>
  );
}
