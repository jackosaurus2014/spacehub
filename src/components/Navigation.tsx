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
import NotificationBell from '@/components/ui/NotificationBell';
import RecentlyViewed from './ui/RecentlyViewed';
import { usePlatformModifier } from '@/hooks/useKeyboardShortcut';
import { trackGA4Event } from '@/lib/analytics';
import { SITE_STATS } from '@/lib/site-stats';

interface DropdownItem {
  label: string;
  href: string;
  description: string;
}

interface RecentModule {
  label: string;
  href: string;
}

const RECENT_MODULES_KEY = 'spacenexus-recent-modules';
const MAX_RECENT_MODULES = 5;
const MOBILE_INITIAL_ITEMS = 8;

type CategoryKey = 'news' | 'markets' | 'business' | 'explore';

const ALL_CATEGORIES: { key: CategoryKey; label: string; items: DropdownItem[] }[] = [
  { key: 'news', label: 'News', items: [] },
  { key: 'markets', label: 'Markets', items: [] },
  { key: 'business', label: 'Business', items: [] },
  { key: 'explore', label: 'Explore', items: [] },
];

const NEWS_ITEMS: DropdownItem[] = [
  { label: 'News Feed', href: '/news', description: 'Latest space industry news' },
  { label: 'AI Insights & Analysis', href: '/ai-insights', description: 'AI-powered industry analysis' },
  { label: 'SpaceNexus Blog', href: '/blog', description: 'Guides, analysis & market reports' },
  { label: 'Industry Blogs', href: '/blogs', description: 'Expert industry insights' },
  { label: 'Daily Digest', href: '/daily-digest', description: 'Curated daily headlines' },
  { label: 'Podcasts', href: '/podcasts', description: 'Space podcast directory' },
  { label: 'Space Defense', href: '/space-defense', description: 'Military space & national security' },
  { label: 'Newsletter', href: '/newsletter', description: 'Weekly intelligence brief' },
];

const MARKETS_ITEMS: DropdownItem[] = [
  { label: 'Market Intelligence', href: '/market-intel', description: 'Companies and stock tracking' },
  { label: 'Company Profiles', href: '/company-profiles', description: `${SITE_STATS.companies} space company profiles` },
  { label: 'Funding & Deals', href: '/funding-tracker', description: 'Live funding rounds & M&A' },
  { label: 'Investors', href: '/investors', description: 'Investor directory & deal flow' },
  { label: 'Startup Tracker', href: '/startup-tracker', description: 'Emerging space companies' },
  { label: 'Executive Moves', href: '/executive-moves', description: 'Leadership changes' },
  { label: 'Government Budgets', href: '/government-budgets', description: 'Agency budget tracking' },
  { label: 'Supply Chain', href: '/supply-chain', description: 'Aerospace supply chain intel' },
  { label: 'Industry Stats', href: '/space-stats', description: 'Key space industry statistics' },
];

const BUSINESS_ITEMS: DropdownItem[] = [
  { label: 'Business Opportunities', href: '/business-opportunities', description: 'AI-powered opportunity discovery' },
  { label: 'Marketplace', href: '/marketplace', description: 'Services, RFQs & providers' },
  { label: 'Procurement (SAM.gov)', href: '/procurement', description: 'Government contract opportunities' },
  { label: 'Regulatory & Compliance', href: '/compliance', description: 'Compliance, space law & filings' },
  { label: 'Patents', href: '/patents', description: 'Space technology patent trends' },
  { label: 'Spectrum', href: '/spectrum', description: 'Allocations, auctions & filings' },
  { label: 'Space Manufacturing', href: '/space-manufacturing', description: 'In-space manufacturing & imagery' },
  { label: 'Mission Cost & Insurance', href: '/mission-cost', description: 'Cost estimates & risk pricing' },
  { label: 'Deal Rooms', href: '/deal-rooms', description: 'Secure document sharing' },
  { label: 'Gig Work', href: '/gig-work', description: 'Freelance & contract work' },
];

const EXPLORE_ITEMS: DropdownItem[] = [
  { label: 'Mission Control', href: '/mission-control', description: 'Upcoming launches and events' },
  { label: 'Satellite Tracker', href: '/satellites', description: 'Track ISS, Starlink & more' },
  { label: 'Space Environment', href: '/space-environment', description: 'Weather, debris & operations' },
  { label: 'Asteroid Watch', href: '/asteroid-watch', description: 'NEOs and planetary defense' },
  { label: 'Mars Planner', href: '/mars-planner', description: 'Mars missions & launch windows' },
  { label: 'Cislunar', href: '/cislunar', description: 'Gateway, Artemis & lunar economy' },
  { label: 'Solar System', href: '/solar-exploration', description: '3D planetary visualization' },
  { label: 'Spaceports', href: '/spaceports', description: 'Spaceports & comms networks' },
  { label: 'Space Stations', href: '/space-stations', description: 'ISS, Tiangong & commercial stations' },
  { label: 'Launch Vehicles', href: '/launch-vehicles', description: 'Compare rocket specs & costs' },
  { label: 'Aurora Forecast', href: '/aurora-forecast', description: 'Northern lights & Kp index' },
  { label: 'Tools & Calculators', href: '/tools', description: 'All calculators & analysis tools' },
  { label: 'Glossary', href: '/glossary', description: 'Key space terms defined' },
  { label: 'Community Forums', href: '/community/forums', description: 'Discuss with professionals' },
  { label: 'Mentors', href: '/mentors', description: 'Industry advisors & office hours' },
];
// Wire up items to category metadata after const arrays are defined
ALL_CATEGORIES[0].items = NEWS_ITEMS;
ALL_CATEGORIES[1].items = MARKETS_ITEMS;
ALL_CATEGORIES[2].items = BUSINESS_ITEMS;
ALL_CATEGORIES[3].items = EXPLORE_ITEMS;

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
                  {item.href === '/compliance' && !isPro && (
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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Mobile menu state
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);
  const [showAllItems, setShowAllItems] = useState<Record<CategoryKey, boolean>>({
    news: false,
    markets: false,
    business: false,
    explore: false,
  });
  const [recentModules, setRecentModules] = useState<RecentModule[]>([]);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Unread message count
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

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

  useEffect(() => {
    if (!session?.user) return;

    let cancelled = false;

    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages/unread');
        if (res.ok && !cancelled) {
          const json = await res.json();
          setUnreadMsgCount(json?.data?.unreadCount ?? 0);
        }
      } catch {
        // silently fail
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session?.user]);

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
    const allItems = [...NEWS_ITEMS, ...MARKETS_ITEMS, ...BUSINESS_ITEMS, ...EXPLORE_ITEMS];
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
      setShowAllItems({ news: false, markets: false, business: false, explore: false });
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
            <span className="text-white/90 hover:text-white text-sm font-medium transition-colors whitespace-nowrap">Home</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4">
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
              label="Explore"
              items={EXPLORE_ITEMS}
              isOpen={openDropdown === 'explore'}
              onToggle={() => toggleDropdown('explore')}
              isPro={isPro}
            />
            <Link
              href="/space-talent"
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
              href="/pricing"
              className="text-white/50 hover:text-white transition-colors text-sm"
            >
              Pricing
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
            {/* Keyboard Shortcuts — hidden for cleaner toolbar */}
            {/* Utility buttons moved to profile/settings for cleaner toolbar */}
            {/* Notification Center */}
            <NotificationBell />
            <NotificationCenter />
            {/* Messages */}
            {session && (
              <Link
                href="/messages"
                className="relative p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
                aria-label={`Messages${unreadMsgCount > 0 ? ` (${unreadMsgCount} unread)` : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {unreadMsgCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-lg shadow-red-500/30">
                    {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                  </span>
                )}
              </Link>
            )}
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
            <NotificationBell />
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
          <div className="lg:hidden fixed inset-0 top-[72px] z-[60] animate-fade-in">
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
                      href="/space-talent"
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
                      href="/pricing"
                      className="flex items-center px-3 py-2 rounded-lg text-white/90 hover:bg-white/[0.05] hover:text-white active:bg-white/[0.08] transition-colors text-sm font-medium min-h-[44px]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Pricing
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
                                  {item.href === '/compliance' && !isPro && (
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

                {/* Messages (mobile) */}
                {session && (
                  <div className="pt-4 border-t border-white/[0.06]">
                    <Link
                      href="/messages"
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Messages
                      {unreadMsgCount > 0 && (
                        <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5">
                          {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                        </span>
                      )}
                    </Link>
                  </div>
                )}

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

