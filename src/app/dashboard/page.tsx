'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { NEWS_CATEGORIES } from '@/types';
import DashboardLayoutSelector from '@/components/DashboardLayoutSelector';
import ModuleConfigurator from '@/components/ModuleConfigurator';
import { SkeletonPage } from '@/components/ui/Skeleton';
import {
  getEffectiveLayout,
  getGridColumnsClass,
  getModuleSizeClasses,
  isSectionVisible,
  type LayoutGridColumns,
  type ModuleSize,
  type DashboardSection,
} from '@/lib/dashboard-layouts';

const categoryIcons: Record<string, string> = {
  launches: '🚀',
  missions: '🛸',
  companies: '🏢',
  earnings: '💰',
  development: '🔧',
  policy: '📜',
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articleCounts, setArticleCounts] = useState<Record<string, number>>({});
  const [layoutSelectorOpen, setLayoutSelectorOpen] = useState(false);
  const [moduleConfigOpen, setModuleConfigOpen] = useState(false);

  // Layout state
  const [gridColumns, setGridColumns] = useState<LayoutGridColumns>(2);
  const [moduleSize, setModuleSize] = useState<ModuleSize>('standard');
  const [sections, setSections] = useState<DashboardSection[]>([]);
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  // Load layout on mount
  const loadLayout = useCallback(() => {
    const layout = getEffectiveLayout();
    setGridColumns(layout.gridColumns);
    setModuleSize(layout.moduleSize);
    setSections(layout.sections);
    setLayoutLoaded(true);
  }, []);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      for (const category of NEWS_CATEGORIES) {
        try {
          const res = await fetch(`/api/news?category=${category.slug}&limit=1`);
          const data = await res.json();
          counts[category.slug] = data.total;
        } catch {
          counts[category.slug] = 0;
        }
      }
      setArticleCounts(counts);
    };

    if (status === 'authenticated') {
      fetchCounts();
    }
  }, [status]);

  const handleLayoutChange = () => {
    loadLayout();
  };

  if (status === 'loading' || !layoutLoaded) {
    return <SkeletonPage statCards={4} statGridCols="grid-cols-2 md:grid-cols-4" contentCards={4} contentGridCols="grid-cols-1 md:grid-cols-2" />;
  }

  if (!session) {
    return null;
  }

  const sizeClasses = getModuleSizeClasses(moduleSize);
  const gridClass = getGridColumnsClass(gridColumns);

  // For category grid, adjust columns based on layout
  const categoryGridClass =
    gridColumns === 1
      ? 'grid-cols-2 md:grid-cols-3'
      : gridColumns === 2
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Control Buttons */}
        <div className="flex justify-end gap-3 mb-4">
          <button
            onClick={() => setModuleConfigOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 hover:border-cyan-400/50 text-cyan-300 hover:text-cyan-200 transition-all text-sm font-medium shadow-sm hover:shadow-md hover:shadow-cyan-500/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure Modules
          </button>
          <button
            onClick={() => setLayoutSelectorOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg hover:border-nebula-300/50 transition-all shadow-sm hover:shadow-md"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            Customize Layout
          </button>
        </div>

        {/* Welcome Header */}
        {isSectionVisible('welcome', sections) && (
          <div className={`card ${sizeClasses.padding} mb-8 glow-border animate-fade-in`}>
            <div className="flex items-center space-x-4">
              <div
                className={`${
                  moduleSize === 'compact'
                    ? 'w-12 h-12 text-lg'
                    : moduleSize === 'expanded'
                    ? 'w-20 h-20 text-2xl'
                    : 'w-16 h-16 text-xl'
                } rounded-full bg-gradient-to-br from-nebula-500 to-rocket-500 flex items-center justify-center text-slate-900 font-bold`}
              >
                {session.user?.name?.charAt(0)?.toUpperCase() || 'E'}
              </div>
              <div>
                <h1
                  className={`font-display font-bold text-slate-900 ${
                    moduleSize === 'compact'
                      ? 'text-xl'
                      : moduleSize === 'expanded'
                      ? 'text-3xl'
                      : 'text-2xl'
                  }`}
                >
                  Welcome back, {session.user?.name || 'Explorer'}!
                </h1>
                <p className={`text-slate-400 ${sizeClasses.text}`}>
                  {session.user?.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {isSectionVisible('quick-stats', sections) && (
          <div className={`grid ${gridClass} ${sizeClasses.gap} mb-8`}>
            <div className={`card ${sizeClasses.padding} animate-fade-in`} style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center space-x-4">
                <span className={sizeClasses.icon}>📊</span>
                <div>
                  <p className={`text-slate-400 ${moduleSize === 'compact' ? 'text-xs' : 'text-sm'}`}>
                    Total Articles
                  </p>
                  <p
                    className={`font-bold text-slate-900 ${
                      moduleSize === 'compact'
                        ? 'text-xl'
                        : moduleSize === 'expanded'
                        ? 'text-3xl'
                        : 'text-2xl'
                    }`}
                  >
                    {Object.values(articleCounts).reduce((a, b) => a + b, 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className={`card ${sizeClasses.padding} animate-fade-in`} style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center space-x-4">
                <span className={sizeClasses.icon}>📂</span>
                <div>
                  <p className={`text-slate-400 ${moduleSize === 'compact' ? 'text-xs' : 'text-sm'}`}>
                    Categories
                  </p>
                  <p
                    className={`font-bold text-slate-900 ${
                      moduleSize === 'compact'
                        ? 'text-xl'
                        : moduleSize === 'expanded'
                        ? 'text-3xl'
                        : 'text-2xl'
                    }`}
                  >
                    {NEWS_CATEGORIES.length}
                  </p>
                </div>
              </div>
            </div>
            <div className={`card ${sizeClasses.padding} animate-fade-in`} style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center space-x-4">
                <span className={sizeClasses.icon}>🌟</span>
                <div>
                  <p className={`text-slate-400 ${moduleSize === 'compact' ? 'text-xs' : 'text-sm'}`}>
                    Member Since
                  </p>
                  <p
                    className={`font-bold text-slate-900 ${
                      moduleSize === 'compact'
                        ? 'text-xl'
                        : moduleSize === 'expanded'
                        ? 'text-3xl'
                        : 'text-2xl'
                    }`}
                  >
                    Today
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Overview */}
        {isSectionVisible('category-overview', sections) && (
          <div className={`card ${sizeClasses.padding} mb-8 animate-fade-in`} style={{ animationDelay: '0.25s' }}>
            <h2
              className={`font-display font-bold text-slate-900 mb-6 flex items-center ${
                moduleSize === 'compact'
                  ? 'text-lg'
                  : moduleSize === 'expanded'
                  ? 'text-2xl'
                  : 'text-xl'
              }`}
            >
              <span className={`mr-3 ${moduleSize === 'compact' ? 'text-xl' : 'text-2xl'}`}>
                📈
              </span>
              Articles by Category
            </h2>
            <div className={`grid ${categoryGridClass} gap-4`}>
              {NEWS_CATEGORIES.map((category) => (
                <Link
                  key={category.slug}
                  href={`/news?category=${category.slug}`}
                  className={`bg-slate-100 border border-slate-200 rounded-lg ${
                    moduleSize === 'compact' ? 'p-3' : 'p-4'
                  } text-center hover:border-nebula-500/50 transition-all`}
                >
                  <span
                    className={`block mb-2 ${
                      moduleSize === 'compact'
                        ? 'text-2xl'
                        : moduleSize === 'expanded'
                        ? 'text-4xl'
                        : 'text-3xl'
                    }`}
                  >
                    {categoryIcons[category.slug]}
                  </span>
                  <p
                    className={`text-slate-900 font-semibold ${
                      moduleSize === 'compact' ? 'text-xs' : 'text-sm'
                    }`}
                  >
                    {category.name}
                  </p>
                  <p
                    className={`text-nebula-300 font-bold ${
                      moduleSize === 'compact' ? 'text-base' : 'text-lg'
                    }`}
                  >
                    {articleCounts[category.slug] || 0}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {isSectionVisible('quick-actions', sections) && (
          <div className={`card ${sizeClasses.padding} animate-fade-in`} style={{ animationDelay: '0.3s' }}>
            <h2
              className={`font-display font-bold text-slate-900 mb-6 flex items-center ${
                moduleSize === 'compact'
                  ? 'text-lg'
                  : moduleSize === 'expanded'
                  ? 'text-2xl'
                  : 'text-xl'
              }`}
            >
              <span className={`mr-3 ${moduleSize === 'compact' ? 'text-xl' : 'text-2xl'}`}>
                ⚡
              </span>
              Quick Actions
            </h2>
            <div className={`grid ${gridClass} gap-4`}>
              <Link
                href="/news"
                className={`bg-slate-100 border border-slate-200 rounded-lg ${sizeClasses.padding} hover:border-nebula-500/50 transition-all group`}
              >
                <span className={`block mb-3 ${sizeClasses.icon}`}>📰</span>
                <h3
                  className={`text-slate-900 font-semibold group-hover:text-nebula-200 transition-colors ${
                    moduleSize === 'compact' ? 'text-sm' : ''
                  }`}
                >
                  Browse All News
                </h3>
                <p
                  className={`text-slate-400 mt-1 ${
                    moduleSize === 'compact' ? 'text-xs' : 'text-sm'
                  }`}
                >
                  Explore the latest space industry updates
                </p>
              </Link>
              <Link
                href="/news?category=launches"
                className={`bg-slate-100 border border-slate-200 rounded-lg ${sizeClasses.padding} hover:border-nebula-500/50 transition-all group`}
              >
                <span className={`block mb-3 ${sizeClasses.icon}`}>🚀</span>
                <h3
                  className={`text-slate-900 font-semibold group-hover:text-nebula-200 transition-colors ${
                    moduleSize === 'compact' ? 'text-sm' : ''
                  }`}
                >
                  Upcoming Launches
                </h3>
                <p
                  className={`text-slate-400 mt-1 ${
                    moduleSize === 'compact' ? 'text-xs' : 'text-sm'
                  }`}
                >
                  Stay updated on rocket launches
                </p>
              </Link>
              <Link
                href="/news?category=companies"
                className={`bg-slate-100 border border-slate-200 rounded-lg ${sizeClasses.padding} hover:border-nebula-500/50 transition-all group`}
              >
                <span className={`block mb-3 ${sizeClasses.icon}`}>🏢</span>
                <h3
                  className={`text-slate-900 font-semibold group-hover:text-nebula-200 transition-colors ${
                    moduleSize === 'compact' ? 'text-sm' : ''
                  }`}
                >
                  Company News
                </h3>
                <p
                  className={`text-slate-400 mt-1 ${
                    moduleSize === 'compact' ? 'text-xs' : 'text-sm'
                  }`}
                >
                  Follow major space companies
                </p>
              </Link>
            </div>
          </div>
        )}

        {/* Future Features Teaser */}
        {isSectionVisible('coming-soon', sections) && (
          <div
            className={`card ${sizeClasses.padding} mt-8 border-dashed animate-fade-in`}
            style={{ animationDelay: '0.35s' }}
          >
            <div className="text-center">
              <span
                className={`block mb-4 ${
                  moduleSize === 'compact'
                    ? 'text-4xl'
                    : moduleSize === 'expanded'
                    ? 'text-6xl'
                    : 'text-5xl'
                }`}
              >
                🔮
              </span>
              <h2
                className={`font-display font-bold text-slate-900 mb-2 ${
                  moduleSize === 'compact'
                    ? 'text-lg'
                    : moduleSize === 'expanded'
                    ? 'text-2xl'
                    : 'text-xl'
                }`}
              >
                Coming Soon
              </h2>
              <p
                className={`text-slate-400 max-w-2xl mx-auto ${
                  moduleSize === 'compact' ? 'text-sm' : ''
                }`}
              >
                Save articles, customize your news feed, receive notifications for
                launches, and more. Stay tuned for exciting new features!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Layout Selector Modal */}
      <DashboardLayoutSelector
        isOpen={layoutSelectorOpen}
        onClose={() => setLayoutSelectorOpen(false)}
        onLayoutChange={handleLayoutChange}
      />

      {/* Module Configurator Modal */}
      <ModuleConfigurator
        isOpen={moduleConfigOpen}
        onClose={() => setModuleConfigOpen(false)}
      />
    </div>
  );
}
