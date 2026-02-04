'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { UserModuleWithConfig } from '@/lib/module-preferences';
import { useSubscription } from '@/components/SubscriptionProvider';
import PremiumGate, { PremiumBadge } from '@/components/PremiumGate';
import { getRequiredTierForModule } from '@/lib/subscription';
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
import ModuleCustomizer from './ModuleCustomizer';
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
};

export default function ModuleContainer({ initialModules }: ModuleContainerProps) {
  const { data: session } = useSession();
  const [modules, setModules] = useState<UserModuleWithConfig[]>(initialModules || []);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [loading, setLoading] = useState(!initialModules);

  useEffect(() => {
    if (!initialModules) {
      fetchModules();
    }
  }, [session, initialModules]);

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

  const handleToggleModule = async (moduleId: string, enabled: boolean) => {
    if (!session) {
      // For non-authenticated users, just update local state
      setModules(prev =>
        prev.map(m => m.moduleId === moduleId ? { ...m, enabled } : m)
      );
      return;
    }

    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (data.modules) {
        setModules(data.modules);
      }
    } catch (error) {
      console.error('Failed to toggle module:', error);
    }
  };

  const handleReorderModules = async (newOrder: string[]) => {
    // Optimistically update UI
    const reorderedModules = newOrder.map((moduleId, index) => {
      const module = modules.find(m => m.moduleId === moduleId);
      return module ? { ...module, position: index } : null;
    }).filter(Boolean) as UserModuleWithConfig[];

    setModules(reorderedModules);

    if (!session) return;

    try {
      const res = await fetch('/api/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleOrder: newOrder }),
      });
      const data = await res.json();
      if (data.modules) {
        setModules(data.modules);
      }
    } catch (error) {
      console.error('Failed to reorder modules:', error);
    }
  };

  const enabledModules = modules
    .filter(m => m.enabled)
    .sort((a, b) => a.position - b.position);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customization Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCustomizer(!showCustomizer)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            showCustomizer
              ? 'bg-nebula-500 text-white'
              : 'bg-space-700/50 text-star-200 hover:bg-space-600/50 border border-space-600'
          }`}
        >
          <span>⚙️</span>
          <span>Customize</span>
        </button>
      </div>

      {/* Module Customizer Panel */}
      {showCustomizer && (
        <ModuleCustomizer
          modules={modules}
          onToggle={handleToggleModule}
          onReorder={handleReorderModules}
          onClose={() => setShowCustomizer(false)}
          isAuthenticated={!!session}
        />
      )}

      {/* Render Enabled Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {enabledModules.map((module, index) => {
          const Component = MODULE_COMPONENTS[module.moduleId];
          if (!Component) return null;

          const requiredTier = getRequiredTierForModule(module.moduleId);
          const isWide = ['news-feed', 'mission-control', 'market-intel'].includes(module.moduleId);

          return (
            <section
              key={module.moduleId}
              className={`animate-fade-in-up ${isWide ? 'lg:col-span-2' : ''}`}
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
            >
              {requiredTier && (
                <div className="flex items-center gap-2 mb-2">
                  <PremiumBadge tier={requiredTier} />
                </div>
              )}
              <ModuleErrorBoundary moduleName={module.name}>
                <PremiumGate moduleId={module.moduleId}>
                  <Component />
                </PremiumGate>
              </ModuleErrorBoundary>
            </section>
          );
        })}
      </div>

      {enabledModules.length === 0 && (
        <div className="card p-8 text-center">
          <span className="text-5xl block mb-4">🛸</span>
          <h3 className="text-xl font-semibold text-white mb-2">No Modules Enabled</h3>
          <p className="text-star-300 mb-4">
            Click the Customize button to enable modules for your dashboard.
          </p>
          <button
            onClick={() => setShowCustomizer(true)}
            className="btn-primary"
          >
            Enable Modules
          </button>
        </div>
      )}
    </div>
  );
}
