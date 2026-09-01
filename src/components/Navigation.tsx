'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useSubscription } from './SubscriptionProvider';
import { useHighContrast } from '@/hooks/useHighContrast';
import NotificationCenter from './NotificationCenter';
import DensityToggle from '@/components/ui/DensityToggle';
import RecentlyViewed from './ui/RecentlyViewed';
import { usePlatformModifier } from '@/hooks/useKeyboardShortcut';
import { trackGA4Event } from '@/lib/analytics';
import { SITE_STATS } from '@/lib/site-stats';
import { navItemsFor } from '@/lib/site-directory';
import CommandPalette from './CommandPalette';

interface DropdownItem {
  label: string;
  href: string;
  description: string;
  hot?: boolean;
  pro?: boolean;
}

interface RecentModule {
  label: string;
  href: string;
}

const RECENT_MODULES_KEY = 'spacenexus-recent-modules';
const MAX_RECENT_MODULES = 5;
// Menus are short now (nav:true rows only); the old 'Show all' fold fired for one
// category and revealed one row. Effectively disabled (SYNTHESIS.md item 20).
const MOBILE_INITIAL_ITEMS = 99;

type CategoryKey = 'launches' | 'news' | 'markets' | 'business' | 'learn';

// Menus are fed from the site directory (src/lib/site-directory.ts): each
// group's `nav: true` rows — the handful people actually use — plus a final
// "Everything in …" row that opens the full group on /tools. The long tail
// left the menus on 2026-08-28 (founder request; 52 of 115 sections had ≤5
// views/28d) without any page going away.
function menuItems(key: CategoryKey, label: string): DropdownItem[] {
  return [
    ...navItemsFor(key).map((e) => ({ label: e.name, href: e.href, description: e.description, hot: e.hot, pro: e.pro })),
    { label: `Everything in ${label} →`, href: `/tools#${key}`, description: 'The full directory' },
  ];
}

const LAUNCHES_ITEMS: DropdownItem[] = menuItems('launches', 'Launches');
const NEWS_ITEMS: DropdownItem[] = menuItems('news', 'News');
const MARKETS_ITEMS: DropdownItem[] = menuItems('markets', 'Markets');
const BUSINESS_ITEMS: DropdownItem[] = menuItems('business', 'Business');
const LEARN_ITEMS: DropdownItem[] = menuItems('learn', 'Learn');

const ALL_CATEGORIES: { key: CategoryKey; label: string; items: DropdownItem[] }[] = [
  { key: 'launches', label: 'Launches', items: LAUNCHES_ITEMS },
  { key: 'news', label: 'News', items: NEWS_ITEMS },
  { key: 'markets', label: 'Markets', items: MARKETS_ITEMS },
  { key: 'business', label: 'Business', items: BUSINESS_ITEMS },
  { key: 'learn', label: 'Learn', items: LEARN_ITEMS },
];

function DropdownMenu({
  label,
  items,
  isOpen,
  onToggle,
  isPro,
}: {
  label: string;
  items: DropdownItem[];
  isOpen: boolean;
  onToggle: () => void;
  isPro: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Reset refs array when items change
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

  // Focus first item when dropdown opens, reset when it closes
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is rendered before focusing
      requestAnimationFrame(() => {
        if (itemRefs.current[0]) {
          itemRefs.current[0].focus();
          setFocusedIndex(0);
        }
      });
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (isOpen) onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const handleTriggerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        onToggle();
      }
    }
  }, [isOpen, onToggle]);

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = focusedIndex < items.length - 1 ? focusedIndex + 1 : 0;
        itemRefs.current[nextIndex]?.focus();
        setFocusedIndex(nextIndex);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : items.length - 1;
        itemRefs.current[prevIndex]?.focus();
        setFocusedIndex(prevIndex);
        break;
      }
      case 'Escape': {
        e.preventDefault();
        onToggle();
        triggerRef.current?.focus();
        break;
      }
      case 'Tab': {
        // Let default Tab behavior happen but close the dropdown
        onToggle();
        break;
      }
      case 'Home': {
        e.preventDefault();
        itemRefs.current[0]?.focus();
        setFocusedIndex(0);
        break;
      }
      case 'End': {
        e.preventDefault();
        const lastIndex = items.length - 1;
        itemRefs.current[lastIndex]?.focus();
        setFocusedIndex(lastIndex);
        break;
      }
    }
  }, [focusedIndex, items.length, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={onToggle}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="text-white/90 hover:text-white transition-colors text-sm font-medium flex items-center gap-1"
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={`${label} submenu`}
          onKeyDown={handleMenuKeyDown}
          className={`absolute top-full left-0 mt-2 border rounded-lg overflow-hidden animate-fade-in-down z-50 ${items.length > 12 ? 'w-[32rem]' : 'w-72'}`}
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)', boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.5)' }}
        >
          <div className={`p-2 max-h-[70vh] overflow-y-auto scrollbar-hide ${items.length > 12 ? 'grid grid-cols-2 gap-x-1' : ''}`}>
            {items.map((item, index) => (
              <Link
                key={item.href}
                ref={(el) => { itemRefs.current[index] = el; }}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                className={`block px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-all duration-150 ease-smooth group ${focusedIndex === index ? 'bg-white/[0.05]' : ''}`}
                onClick={onToggle}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white/90 text-sm font-medium group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                  {item.hot && <span className="text-[10px] text-[var(--ember)] mr-1" aria-label="popular">●</span>}{item.pro && !isPro && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-white/10 text-white/70 border border-white/10">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navigation() {
  const { data: session, status } = useSession();
  const { isPro } = useSubscription();
  const { isHighContrast, toggleHighContrast } = useHighContrast();
  const pathname = usePathname();
  const platformModifier = usePlatformModifier();
  const shortcutKey = platformModifier === 'meta' ? 'Cmd' : 'Ctrl';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Mobile menu is a modal: Escape closes it and the page behind is inert
  // (same pattern OnboardingTour uses). SYNTHESIS.md item 20.
  useEffect(() => {
    if (!isMenuOpen) return;
    const main = document.getElementById('main-content');
    main?.setAttribute('inert', '');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => { main?.removeAttribute('inert'); document.removeEventListener('keydown', onKey); };
  }, [isMenuOpen]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Mobile menu state
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);
  const [showAllItems, setShowAllItems] = useState<Record<CategoryKey, boolean>>({
    launches: false,
    news: false,
    markets: false,
    business: false,
    learn: false,
  });
  const [recentModules, setRecentModules] = useState<RecentModule[]>([]);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Live launch indicator — lightweight poll of the same endpoint LiveNowBanner uses
  const [isLiveNow, setIsLiveNow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchLive = async () => {
      try {
        const res = await fetch('/api/livestreams/active', {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setIsLiveNow(Array.isArray(data?.live) && data.live.length > 0);
        }
      } catch {
        // silently fail
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 60000); // poll every 60s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);


  // Load recent modules from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_MODULES_KEY);
      if (stored) {
        setRecentModules(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save current page to recent modules on navigation
  useEffect(() => {
    if (!pathname || pathname === '/') return;

    // Find matching item across all categories
    const allItems = ALL_CATEGORIES.flatMap((c) => c.items);
    const match = allItems.find((item) => item.href === pathname);
    if (!match) return;

    setRecentModules((prev) => {
      const filtered = prev.filter((m) => m.href !== pathname);
      const updated = [{ label: match.label, href: match.href }, ...filtered].slice(0, MAX_RECENT_MODULES);
      try {
        localStorage.setItem(RECENT_MODULES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, [pathname]);

  // Reset mobile menu state when menu closes
  useEffect(() => {
    if (!isMenuOpen) {
      setMobileSearchQuery('');
      setExpandedCategory(null);
      setShowAllItems({ launches: false, news: false, markets: false, business: false, learn: false });
    }
  }, [isMenuOpen]);

  // Focus search input when mobile menu opens
  useEffect(() => {
    if (isMenuOpen) {
      requestAnimationFrame(() => {
        mobileSearchRef.current?.focus();
      });
    }
  }, [isMenuOpen]);

  // Mobile search filtering
  const mobileFilteredCategories = useMemo(() => {
    const query = mobileSearchQuery.toLowerCase().trim();
    if (!query) return ALL_CATEGORIES;

    return ALL_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [mobileSearchQuery]);

  const toggleMobileCategory = (key: CategoryKey) => {
    setExpandedCategory((prev) => (prev === key ? null : key));
  };

  const toggleShowAll = (key: CategoryKey) => {
    setShowAllItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 20);

      // Auto-hide nav on scroll down, show on scroll up (mobile only)
      // Only hide after scrolling past 100px to avoid flickering at top
      if (currentY > 100) {
        const delta = currentY - lastScrollY.current;
        if (delta > 10) {
          // Scrolling down — hide nav (only if no dropdown/menu is open)
          if (!isMenuOpen && !openDropdown) {
            setNavHidden(true);
          }
        } else if (delta < -5) {
          // Scrolling up — show nav
          setNavHidden(false);
        }
      } else {
        setNavHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMenuOpen, openDropdown]);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  return (
    <nav
      aria-label="Main navigation"
      className={`nav-persistent sticky top-0 z-50 transition-all duration-200 safe-area-pt ${navHidden ? '-translate-y-full' : 'translate-y-0'}`}
      style={{
        background: 'var(--bg-void, #09090b)',
        borderBottom: '1px solid var(--border-subtle, #27272a)',
      }}
    >
      {/* Global Cmd+K / Ctrl+K terminal palette (renders via portal when open) */}
      <CommandPalette />
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Home */}
          <Link href="/" className="flex items-center gap-2 opacity-90 hover:opacity-100 transition-opacity shrink-0 mr-8">
            <Image
              src="/spacenexus-logo.png"
              alt="SpaceNexus logo"
              width={160}
              height={80}
              className="h-5 w-auto"
              priority
            />
            <span className="sr-only">SpaceNexus home</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4">
            {/* "Live" is a lie 23 hours a day (SYNTHESIS.md §3): the link appears only during a broadcast; the LiveRail carries the next launch otherwise. */}
            {isLiveNow && (
            <Link
              href="/live"
              className="text-white/90 hover:text-white transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              {isLiveNow && (
                <span className="relative inline-flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
              )}
              Live
              {isLiveNow && <span className="sr-only">(broadcast in progress)</span>}
            </Link>
            )}
            <DropdownMenu
              label="Launches"
              items={LAUNCHES_ITEMS}
              isOpen={openDropdown === 'launches'}
              onToggle={() => toggleDropdown('launches')}
              isPro={isPro}
            />
            <DropdownMenu
              label="News"
              items={NEWS_ITEMS}
              isOpen={openDropdown === 'news'}
              onToggle={() => toggleDropdown('news')}
              isPro={isPro}
            />
            <DropdownMenu
              label="Markets"
              items={MARKETS_ITEMS}
              isOpen={openDropdown === 'markets'}
              onToggle={() => toggleDropdown('markets')}
              isPro={isPro}
            />
            <DropdownMenu
              label="Business"
              items={BUSINESS_ITEMS}
              isOpen={openDropdown === 'business'}
              onToggle={() => toggleDropdown('business')}
              isPro={isPro}
            />
            <DropdownMenu
              label="Learn"
              items={LEARN_ITEMS}
              isOpen={openDropdown === 'learn'}
              onToggle={() => toggleDropdown('learn')}
              isPro={isPro}
            />
            <Link
              href="/jobs"
              className="text-white/90 hover:text-white transition-colors text-sm font-medium"
            >
              Jobs
            </Link>
            <Link
              href="/space-tycoon"
              className="text-white/90 hover:text-white transition-colors text-sm font-medium flex items-center gap-1"
            >
              <span>🎮</span> Space Tycoon
            </Link>
            <Link
              href="/tools"
              className="text-white/50 hover:text-white transition-colors text-sm"
              title="Every page and tool on SpaceNexus"
            >
              Index
            </Link>
            {session?.user?.isAdmin && (
              <Link
                href="/admin"
                className="text-amber-400 hover:text-amber-300 transition-colors text-sm font-medium"
              >
                Admin
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden lg:flex items-center gap-2 ml-4">
            {!isPro && (
              <Link
                href="/pricing"
                onClick={() => trackGA4Event('upgrade_clicked', { source: 'nav' })}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/[0.15] text-white/70 hover:text-white hover:border-white/[0.3] transition-all"
              >
                Upgrade
              </Link>
            )}
            {/* Search */}
            <button
              onClick={() => {
                const opener = (window as unknown as Record<string, unknown>).__openSearchPalette;
                if (typeof opener === 'function') {
                  (opener as () => void)();
                }
              }}
              className="relative flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors ease-smooth border border-white/[0.08] hover:border-white/[0.12]"
              aria-label={`Search (${shortcutKey}+K)`}
              title={`Press ${shortcutKey}+K to search`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <span className="hidden lg:inline text-xs text-slate-500">Search</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 bg-white/[0.03] border border-white/[0.08] rounded text-[10px] font-mono text-slate-500">
                {shortcutKey}+K
              </kbd>
            </button>
            {/* Command palette trigger (terminal-style quick nav) */}
            <button
              onClick={() => {
                const opener = (window as unknown as Record<string, unknown>).__openCommandPalette;
                if (typeof opener === 'function') {
                  (opener as () => void)();
                }
              }}
              className="hidden xl:inline-flex items-center px-2 py-1.5 min-h-[44px] rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors ease-smooth border border-white/[0.08] hover:border-white/[0.12] font-mono text-[11px]"
              aria-label={`Open command palette (${shortcutKey}+K)`}
              title={`Command palette (${shortcutKey}+K)`}
            >
              {platformModifier === 'meta' ? '⌘K' : 'Ctrl K'}
            </button>
            {/* Keyboard Shortcuts — hidden for cleaner toolbar */}
            {/* Utility buttons moved to profile/settings for cleaner toolbar */}
            {/* Notification Center (single bell — the old NotificationBell
                called nonexistent /api/notifications endpoints) */}
            <NotificationCenter />
            {/* Messages icon removed 2026-08-26: DMs mothballed (src/lib/mothballed-routes.ts) */}
            {status === 'loading' ? (
              <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : session ? (
              <div className="flex items-center gap-3">
                {isPro && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/10 text-white/60 border border-white/10 uppercase tracking-wider">
                    Pro
                  </span>
                )}
                <span className="text-white/50 text-sm">
                  {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-white/50 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-white/50 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
                  Sign In
                </Link>
                <Link href="/register" className="bg-white text-black font-medium text-xs py-2 px-5 rounded-lg hover:bg-neutral-200 transition-all duration-200">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-2">
            {/* Mobile search button — opens command palette */}
            <button
              type="button"
              onClick={() => {
                const opener = (window as unknown as Record<string, unknown>).__openSearchPalette;
                if (typeof opener === 'function') opener();
              }}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white transition-colors"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
            >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu — portalled to body to escape nav's backdrop-blur stacking context */}
        {isMenuOpen && createPortal(
          <div className="lg:hidden fixed inset-0 top-[72px] z-[60] animate-fade-in" role="dialog" aria-modal="true" aria-label="Site menu">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} role="presentation" aria-hidden="true" />
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto animate-slide-in-right" style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)', boxShadow: '-8px 0 32px -4px rgba(0, 0, 0, 0.5)' }}>
              <div className="p-6 space-y-4">
                {/* Mobile Search Input */}
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    ref={mobileSearchRef}
                    type="search"
                    placeholder="Search modules..."
                    value={mobileSearchQuery}
                    onChange={(e) => setMobileSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-white/[0.15] focus:ring-1 focus:ring-white/[0.08] transition-colors ease-smooth"
                    aria-label="Search navigation modules"
                  />
                  {mobileSearchQuery && (
                    <button
                      onClick={() => setMobileSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white/70 transition-colors"
                      aria-label="Clear search"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Recently Visited Section */}
                {!mobileSearchQuery && recentModules.length > 0 && (
                  <div>
                    <h3 className="text-slate-500 text-xs uppercase tracking-widest font-medium mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Recently Visited
                    </h3>
                    <div className="space-y-0.5">
                      {recentModules.map((mod) => (
                        <Link
                          key={mod.href}
                          href={mod.href}
                          className="block px-3 py-2 rounded-lg text-white/70 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors text-sm font-medium min-h-[44px] flex items-center"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {mod.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct links */}
                {!mobileSearchQuery && (
                  <div className="space-y-0.5">
                    <Link
                      href="/live"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/90 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors text-sm font-medium min-h-[44px]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {isLiveNow && (
                        <span className="relative inline-flex h-2 w-2" aria-hidden="true">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                        </span>
                      )}
                      Live
                    </Link>
                    <Link
                      href="/jobs"
                      className="flex items-center px-3 py-2 rounded-lg text-white/90 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors text-sm font-medium min-h-[44px]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Jobs
                    </Link>
                    <Link
                      href="/space-tycoon"
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-white/90 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors text-sm font-medium min-h-[44px]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span aria-hidden="true">🎮</span> Space Tycoon
                    </Link>
                    <Link
                      href="/tools"
                      className="flex items-center px-3 py-2 rounded-lg text-white/90 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors text-sm font-medium min-h-[44px]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Index
                    </Link>
                  </div>
                )}

                {/* Category Accordions */}
                <div className="space-y-1">
                  {mobileFilteredCategories.map((category) => {
                    const isExpanded = mobileSearchQuery ? true : expandedCategory === category.key;
                    const isShowingAll = showAllItems[category.key] || !!mobileSearchQuery;
                    const visibleItems = isShowingAll
                      ? category.items
                      : category.items.slice(0, MOBILE_INITIAL_ITEMS);
                    const hiddenCount = category.items.length - MOBILE_INITIAL_ITEMS;

                    return (
                      <div key={category.key}>
                        {/* Category Header / Accordion Toggle */}
                        <button
                          onClick={() => {
                            if (!mobileSearchQuery) {
                              toggleMobileCategory(category.key);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors touch-target ${
                            isExpanded
                              ? 'bg-white/[0.04] text-white/70'
                              : 'text-white/70 hover:bg-white/[0.03]'
                          }`}
                          aria-expanded={isExpanded}
                        >
                          <span className="text-xs uppercase tracking-widest font-medium">
                            {category.label}
                            <span className="ml-2 text-slate-500 normal-case tracking-normal">
                              ({category.items.length})
                            </span>
                          </span>
                          {!mobileSearchQuery && (
                            <svg
                              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>

                        {/* Category Items */}
                        {isExpanded && (
                          <div className="space-y-0.5 mt-1">
                            {visibleItems.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                className="block px-3 py-3 rounded-lg text-white/90 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors touch-target"
                                onClick={() => setIsMenuOpen(false)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{item.label}</span>
                                  {item.hot && <span className="text-[10px] text-[var(--ember)] mr-1" aria-label="popular">●</span>}{item.pro && !isPro && (
                                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-white/10 text-white/70 border border-white/10">
                                      PRO
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-400 text-xs mt-0.5">{item.description}</p>
                              </Link>
                            ))}

                            {/* Show More / Show Less toggle */}
                            {!mobileSearchQuery && hiddenCount > 0 && (
                              <button
                                onClick={() => toggleShowAll(category.key)}
                                className="w-full px-3 py-2.5 text-sm text-white/70 hover:text-white font-medium transition-colors flex items-center gap-1.5 justify-center min-h-[44px]"
                              >
                                {isShowingAll ? (
                                  <>
                                    Show fewer
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                    </svg>
                                  </>
                                ) : (
                                  <>
                                    Show all {category.items.length} items
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* No results message */}
                {mobileSearchQuery && mobileFilteredCategories.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-slate-500 text-sm">No modules match &ldquo;{mobileSearchQuery}&rdquo;</p>
                  </div>
                )}

                {session?.user?.isAdmin && (
                  <div>
                    <h3 className="text-white/70 text-xs uppercase tracking-widest font-medium mb-3">Admin</h3>
                    <Link
                      href="/admin"
                      className="block px-3 py-2.5 rounded-lg text-amber-400 hover:bg-white/[0.05] hover:text-amber-300 transition-colors text-sm font-medium min-h-[44px] flex items-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  </div>
                )}

                {/* Global Search link (mobile) */}
                <div className="pt-4 border-t border-white/[0.06]">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white/90 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors text-sm font-medium touch-target"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setTimeout(() => {
                        const opener = (window as unknown as Record<string, unknown>).__openSearchPalette;
                        if (typeof opener === 'function') {
                          (opener as () => void)();
                        }
                      }, 100);
                    }}
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    Global Search
                    <kbd className="ml-auto px-1.5 py-0.5 bg-white/[0.03] border border-white/[0.08] rounded text-[10px] font-mono text-slate-500">
                      Ctrl+K
                    </kbd>
                  </button>
                </div>

                {/* Reading List link (mobile) */}
                <div className="pt-4 border-t border-white/[0.06]">
                  <Link
                    href="/reading-list"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-white/90 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors text-sm font-medium touch-target"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                    Reading List
                  </Link>
                </div>


                {/* New user helper */}
                <div className="pt-4 border-t border-white/[0.06]">
                  <Link
                    href="/getting-started"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-white/90 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors text-sm font-medium touch-target"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    New to SpaceNexus? Start here
                  </Link>
                </div>

                {/* Accessibility */}
                <div className="pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={toggleHighContrast}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-target ${
                      isHighContrast
                        ? 'text-white/90 bg-white/[0.06]'
                        : 'text-white/90 hover:bg-white/[0.05] hover:text-white'
                    }`}
                    aria-pressed={isHighContrast}
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
                    </svg>
                    High Contrast {isHighContrast ? 'On' : 'Off'}
                  </button>
                </div>

                {/* Auth Section */}
                <div className="pt-4 border-t border-white/[0.06] space-y-2 pb-4">
                  {!isPro && (
                    <Link
                      href="/pricing"
                      className="block text-white/70 hover:text-white active:text-white font-medium text-center py-3 text-sm touch-target"
                      onClick={() => {
                        trackGA4Event('upgrade_clicked', { source: 'nav_mobile' });
                        setIsMenuOpen(false);
                      }}
                    >
                      Upgrade to Pro
                    </Link>
                  )}
                  {session ? (
                    <button
                      onClick={() => {
                        signOut();
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-sm py-3 px-4 rounded-lg border border-white/[0.08] text-white/90 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors touch-target"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="block text-sm py-3 px-4 text-center rounded-lg text-white/90 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors touch-target"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/register"
                        className="bg-white text-slate-900 font-medium text-sm py-3 px-4 rounded-lg text-center block hover:bg-slate-100 transition-all duration-200 ease-smooth"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Get Started
                      </Link>
                      <Link
                        href="/register?trial=true"
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium text-sm py-3 px-4 rounded-lg text-center block transition-all duration-200 ease-smooth shadow-lg shadow-cyan-500/20"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Start Free Trial
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        , document.body)}
      </div>
    </nav>
  );
}

