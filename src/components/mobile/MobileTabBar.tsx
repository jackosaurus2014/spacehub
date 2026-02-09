'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useContextualTabs, TabItem } from '@/hooks/useContextualTabs';
import { useHaptics } from '@/hooks/useHaptics';

// ─── "More" menu categories (same as original MobileBottomNav) ──────────────

interface MoreMenuItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

interface MenuCategory {
  title: string;
  items: MoreMenuItem[];
}

const MORE_MENU_CATEGORIES: MenuCategory[] = [
  {
    title: 'Market Intelligence',
    items: [
      { id: 'market-intel', label: 'Market Intel', icon: 'chart', href: '/market-intel' },
      { id: 'space-economy', label: 'Space Economy', icon: 'chart', href: '/space-economy' },
      { id: 'startups', label: 'Space Startups', icon: 'lightbulb', href: '/startups' },
      { id: 'blogs', label: 'Blogs & Articles', icon: 'newspaper', href: '/blogs' },
      { id: 'space-defense', label: 'Space Defense', icon: 'shield', href: '/space-defense' },
    ],
  },
  {
    title: 'Business & Talent',
    items: [
      { id: 'business-opportunities', label: 'Opportunities', icon: 'lightbulb', href: '/business-opportunities' },
      { id: 'space-talent', label: 'Space Talent Hub', icon: 'briefcase', href: '/space-talent' },
      { id: 'supply-chain', label: 'Supply Chain', icon: 'truck', href: '/supply-chain' },
      { id: 'space-mining', label: 'Space Mining', icon: 'mining', href: '/space-mining' },
      { id: 'space-insurance', label: 'Space Insurance', icon: 'shield', href: '/space-insurance' },
      { id: 'manufacturing-imagery', label: 'Manufacturing & Imagery', icon: 'mining', href: '/space-manufacturing' },
      { id: 'patents', label: 'Patents & IP', icon: 'clipboard', href: '/patents' },
    ],
  },
  {
    title: 'Mission Planning',
    items: [
      { id: 'mission-cost', label: 'Cost Simulator', icon: 'chart', href: '/mission-cost' },
      { id: 'launch-vehicles', label: 'Launch Vehicles', icon: 'rocket', href: '/launch-vehicles' },
      { id: 'resource-exchange', label: 'Resource Exchange', icon: 'exchange', href: '/resource-exchange' },
      { id: 'launch-windows', label: 'Launch Windows', icon: 'calendar', href: '/launch-windows' },
      { id: 'blueprints', label: 'Blueprints', icon: 'clipboard', href: '/blueprints' },
    ],
  },
  {
    title: 'Space Operations',
    items: [
      { id: 'satellites', label: 'Satellites', icon: 'satellite', href: '/satellites' },
      { id: 'space-stations', label: 'Space Stations', icon: 'satellite', href: '/space-stations' },
      { id: 'orbital-management', label: 'Orbital Management', icon: 'orbit', href: '/orbital-slots' },
      { id: 'constellations', label: 'Constellations', icon: 'orbit', href: '/constellations' },
      { id: 'ground-stations', label: 'Ground Stations', icon: 'satellite', href: '/ground-stations' },
      { id: 'infrastructure', label: 'Infrastructure', icon: 'rocket', href: '/spaceports' },
    ],
  },
  {
    title: 'Regulatory & Compliance',
    items: [
      { id: 'regulatory-hub', label: 'Regulatory Hub', icon: 'clipboard', href: '/compliance' },
      { id: 'spectrum', label: 'Spectrum Mgmt', icon: 'spectrum', href: '/spectrum' },
    ],
  },
  {
    title: 'Exploration & Environment',
    items: [
      { id: 'solar-exploration', label: 'Solar System', icon: 'planet', href: '/solar-exploration' },
      { id: 'mars-planner', label: 'Mars Planner', icon: 'planet', href: '/mars-planner' },
      { id: 'cislunar', label: 'Cislunar Ecosystem', icon: 'rocket', href: '/cislunar' },
      { id: 'asteroid-watch', label: 'Asteroid Watch', icon: 'planet', href: '/asteroid-watch' },
      { id: 'space-environment', label: 'Space Environment', icon: 'sun', href: '/space-environment' },
    ],
  },
];

const ALL_MORE_HREFS = MORE_MENU_CATEGORIES.flatMap((c) => c.items.map((i) => i.href));

// ─── Icon component (same SVGs as original) ────────────────────────────────

function NavIcon({ icon, className = 'w-6 h-6' }: { icon: string; className?: string }) {
  const props = { className, fill: 'none' as const, stroke: 'currentColor' as const, viewBox: '0 0 24 24' };

  switch (icon) {
    case 'home':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /></svg>);
    case 'newspaper':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>);
    case 'rocket':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>);
    case 'grid':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>);
    case 'dots':
      return (<svg {...props}><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="18" r="1.5" fill="currentColor" stroke="none" /></svg>);
    case 'chart':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>);
    case 'shield':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>);
    case 'exchange':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>);
    case 'satellite':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-4-4m4 4l-4 4m4-4H10m-6 10l4 4m-4-4l4-4m-4 4h10" /><circle cx="12" cy="12" r="2" strokeWidth={2} /></svg>);
    case 'orbit':
      return (<svg {...props}><ellipse cx="12" cy="12" rx="10" ry="4" strokeWidth={2} transform="rotate(-30 12 12)" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></svg>);
    case 'spectrum':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>);
    case 'calendar':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>);
    case 'planet':
      return (<svg {...props}><circle cx="12" cy="12" r="7" strokeWidth={2} /><ellipse cx="12" cy="12" rx="11" ry="4" strokeWidth={1.5} transform="rotate(-20 12 12)" /></svg>);
    case 'sun':
      return (<svg {...props}><circle cx="12" cy="12" r="5" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>);
    case 'mining':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>);
    case 'briefcase':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h2" /></svg>);
    case 'truck':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0H3m10 0a2 2 0 104 0m-4 0a2 2 0 114 0m6-4v4a1 1 0 01-1 1h-1m-6-4h6m-6 0V9a1 1 0 011-1h3.28a1 1 0 01.948.684l1.444 4.316" /></svg>);
    case 'lightbulb':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>);
    case 'clipboard':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>);
    case 'close':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
    case 'back':
      return (<svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>);
    default:
      return null;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { tabs, isContextual, parentName, parentHref } = useContextualTabs();
  const haptics = useHaptics();
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = useCallback(
    (href: string) => {
      if (href === '/') return pathname === '/';
      return pathname === href || pathname.startsWith(href + '/');
    },
    [pathname],
  );

  const moreRouteActive = ALL_MORE_HREFS.some((href) => isActive(href));

  // Close menu on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [moreOpen]);

  const handleTabPress = useCallback((href: string) => {
    haptics.trigger('light');
    router.push(href);
  }, [haptics, router]);

  // Find active tab index for indicator positioning
  const activeTabIndex = tabs.findIndex(tab => isActive(tab.href));

  return (
    <>
      {/* ── Backdrop overlay ── */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Slide-up "More" menu ── */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            ref={menuRef}
            role="dialog"
            aria-label="More navigation options"
            aria-modal={true}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed left-0 right-0 z-50 lg:hidden"
            style={{ bottom: '4rem' }}
          >
            <div
              className="bg-slate-900 border-t border-slate-800 rounded-t-2xl max-h-[70vh] overflow-y-auto overscroll-contain"
              style={{ boxShadow: '0 -8px 32px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(6, 182, 212, 0.12)' }}
            >
              {/* Handle / close header */}
              <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/60 px-4 pt-3 pb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300 tracking-wide uppercase">
                  All Modules
                </span>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close menu"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <NavIcon icon="close" className="w-5 h-5" />
                </button>
              </div>

              {/* Drag handle */}
              <div className="flex justify-center -mt-px">
                <div className="w-10 h-1 rounded-full bg-slate-700 my-1" />
              </div>

              {/* Category sections */}
              <div className="px-4 pb-6 pt-2 space-y-5">
                {MORE_MENU_CATEGORIES.map((category) => (
                  <div key={category.title}>
                    <h3 className="text-xs font-semibold text-cyan-400/80 uppercase tracking-wider mb-2 px-1">
                      {category.title}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {category.items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => haptics.trigger('light')}
                            aria-current={active ? 'page' : undefined}
                            className={`flex flex-col items-center justify-center min-h-[72px] min-w-[44px] px-2 py-3 rounded-xl transition-all duration-200 ${
                              active
                                ? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30'
                                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 active:bg-slate-800'
                            }`}
                          >
                            <NavIcon icon={item.icon} className="w-6 h-6 mb-1.5" />
                            <span className="text-[11px] font-medium text-center leading-tight">
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom tab bar ── */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{
          background: 'linear-gradient(0deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 100%)',
          boxShadow: '0 -4px 16px -4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(6, 182, 212, 0.15)',
        }}
      >
        {/* Top gradient border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

        {/* Contextual label */}
        <AnimatePresence>
          {isContextual && parentName && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-center gap-2 py-1 text-[10px] text-cyan-400/70 border-b border-slate-800/50">
                <span>{parentName}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <LayoutGroup>
          <div className="flex items-center justify-around h-16 px-2 safe-area-pb">
            {/* Back button when contextual */}
            {isContextual && parentHref && (
              <motion.button
                type="button"
                onClick={() => {
                  haptics.trigger('light');
                  router.push('/');
                }}
                whileTap={{ scale: 0.85 }}
                className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] px-1 text-slate-400 hover:text-slate-200"
                aria-label="Back to main navigation"
              >
                <motion.div
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <NavIcon icon="back" />
                </motion.div>
                <span className="mt-1 text-[10px] font-medium">Back</span>
              </motion.button>
            )}

            {/* Tab items */}
            {tabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabPress(tab.href)}
                  whileTap={{ scale: 0.85 }}
                  className={`relative flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] px-1 transition-colors duration-200 ${
                    active ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  aria-label={tab.name}
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Sliding active indicator */}
                  {active && (
                    <motion.div
                      layoutId="mobile-tab-indicator"
                      className="absolute top-0 w-12 h-0.5 rounded-b-full bg-cyan-400"
                      style={{ boxShadow: '0 2px 8px rgba(6, 182, 212, 0.5)' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}

                  {/* Icon with spring animation */}
                  <motion.div
                    className="relative"
                    animate={{ scale: active ? 1.1 : 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    {isContextual ? (
                      <span className="text-lg">{tab.icon}</span>
                    ) : (
                      <NavIcon icon={tab.id === 'home' ? 'home' : tab.id === 'news' ? 'newspaper' : tab.id === 'events' ? 'rocket' : 'grid'} />
                    )}
                    {/* Glow effect for active */}
                    {active && !isContextual && (
                      <div className="absolute inset-0 blur-md opacity-50">
                        <NavIcon icon={tab.id === 'home' ? 'home' : tab.id === 'news' ? 'newspaper' : tab.id === 'events' ? 'rocket' : 'grid'} />
                      </div>
                    )}
                    {/* Badge */}
                    {tab.badge && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {tab.badge > 9 ? '9+' : tab.badge}
                      </span>
                    )}
                  </motion.div>

                  {/* Label */}
                  <motion.span
                    className="mt-1 text-[10px] font-medium truncate max-w-[60px]"
                    animate={{ opacity: active ? 1 : 0.6 }}
                  >
                    {tab.name}
                  </motion.span>
                </motion.button>
              );
            })}

            {/* "More" button (always present) */}
            <motion.button
              type="button"
              onClick={() => {
                haptics.trigger('light');
                setMoreOpen((prev) => !prev);
              }}
              whileTap={{ scale: 0.85 }}
              aria-label="More navigation options"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              className={`relative flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] px-1 transition-colors duration-200 ${
                moreOpen || moreRouteActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {moreRouteActive && !moreOpen && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute top-0 w-12 h-0.5 rounded-b-full bg-cyan-400"
                  style={{ boxShadow: '0 2px 8px rgba(6, 182, 212, 0.5)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <motion.div
                className="relative"
                animate={{
                  scale: moreOpen || moreRouteActive ? 1.1 : 1,
                  rotate: moreOpen ? 45 : 0,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <NavIcon icon="dots" />
                {(moreOpen || moreRouteActive) && (
                  <div className="absolute inset-0 blur-md opacity-50">
                    <NavIcon icon="dots" />
                  </div>
                )}
              </motion.div>

              <motion.span
                className="mt-1 text-[10px] font-medium"
                animate={{ opacity: moreOpen || moreRouteActive ? 1 : 0.6 }}
              >
                More
              </motion.span>
            </motion.button>
          </div>
        </LayoutGroup>
      </nav>
    </>
  );
}
