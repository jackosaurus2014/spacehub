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
import NotificationBell from '@/components/ui/NotificationBell';
import RecentlyViewed from './ui/RecentlyViewed';

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

type CategoryKey = 'explore' | 'intelligence' | 'business' | 'tools';

const ALL_CATEGORIES: { key: CategoryKey; label: string; items: DropdownItem[] }[] = [
  { key: 'explore', label: 'Explore', items: [] },
  { key: 'intelligence', label: 'Intelligence', items: [] },
  { key: 'business', label: 'Business', items: [] },
  { key: 'tools', label: 'Tools', items: [] },
];

const EXPLORE_ITEMS: DropdownItem[] = [
  { label: "What's New", href: '/changelog', description: 'Latest platform updates and features' },
  { label: 'Mission Control', href: '/mission-control', description: 'Upcoming launches and events' },
  { label: 'Mission Pipeline', href: '/mission-pipeline', description: 'Upcoming missions 2025-2030' },
  { label: 'Mission Statistics', href: '/mission-stats', description: 'Launch provider leaderboards & stats' },
  { label: 'News & Categories', href: '/news', description: 'Latest space industry updates' },
  { label: 'Blogs & Articles', href: '/blogs', description: 'Expert industry insights' },
  { label: 'SpaceNexus Blog', href: '/blog', description: 'Guides, analysis & market reports' },
  { label: 'Space Defense', href: '/space-defense', description: 'Military space & national security' },
  { label: 'AI Insights', href: '/ai-insights', description: 'AI-powered industry analysis' },
  { label: 'Market Map', href: '/market-map', description: 'Visual industry landscape by sector' },
  { label: 'Community Forums', href: '/community/forums', description: 'Discussions with space professionals' },
  { label: 'Resources & Podcasts', href: '/resources', description: 'Curated content, podcasts & newsletters' },
  { label: 'Solar Exploration', href: '/solar-exploration', description: '3D planetary visualization' },
  { label: 'Mars Mission Planner', href: '/mars-planner', description: 'Mars missions and launch windows' },
  { label: 'Cislunar Ecosystem', href: '/cislunar', description: 'Gateway, Artemis & lunar economy' },
  { label: 'Asteroid Watch', href: '/asteroid-watch', description: 'NEOs, planetary defense, and mining' },
  { label: 'Space Glossary', href: '/glossary', description: 'Definitions of key space industry terms' },
  { label: 'Space Timeline', href: '/timeline', description: 'History and milestones of space exploration' },
  { label: 'Daily Digest', href: '/news-digest', description: 'Quick-scan daily space headlines' },
  { label: 'Orbit Guide', href: '/orbit-guide', description: 'Visual guide to orbital mechanics & orbit types' },
  { label: 'Career Guide', href: '/career-guide', description: 'Space industry career paths & salary data' },
  { label: 'Acronyms', href: '/acronyms', description: 'A-Z space industry acronym reference' },
  { label: 'Space Weather', href: '/space-weather', description: 'Solar conditions & impact forecasts' },
  { label: 'Earth Events', href: '/earth-events', description: 'NASA EONET natural disaster tracking' },
  { label: 'Space Agencies', href: '/space-agencies', description: 'World space agency profiles & budgets' },
  { label: '🎙️ Space Podcasts', href: '/podcasts', description: '25+ space industry podcasts directory' },
  { label: 'Debris Remediation', href: '/debris-remediation', description: 'Active debris removal efforts and space sustainability' },
  { label: 'Debris Tracker', href: '/debris-tracker', description: 'Track orbital debris' },
  { label: 'Space Tourism', href: '/space-tourism', description: 'Space tourism providers' },
  { label: 'News Aggregator', href: '/news-aggregator', description: 'Curated multi-source news feed' },
  { label: 'Launch Manifest', href: '/launch-manifest', description: 'Global launch schedule & manifest tracker' },
  { label: 'Debris Catalog', href: '/debris-catalog', description: 'Comprehensive orbital debris database' },
  { label: 'Sustainability Scorecard', href: '/sustainability-scorecard', description: 'Space sustainability metrics & ratings' },
  { label: 'FAQ', href: '/faq', description: 'Frequently asked questions' },
  { label: 'Help Center', href: '/help', description: 'Guides, FAQs & support resources' },
  { label: 'Newsletters', href: '/newsletters-directory', description: 'Space industry newsletter directory' },
  { label: 'All Features & Modules', href: '/features', description: 'Browse 30+ modules in one directory' },
  { label: 'Getting Started', href: '/getting-started', description: 'New to SpaceNexus? Start here' },
];

const INTELLIGENCE_ITEMS: DropdownItem[] = [
  { label: 'Market Intel', href: '/market-intel', description: 'Companies and stock tracking' },
  { label: 'Research Assistant', href: '/company-research', description: 'AI-powered company research Q&A' },
  { label: 'Intelligence Brief', href: '/intelligence-brief', description: 'Weekly curated industry briefing' },
  { label: 'Space Economy', href: '/space-economy', description: 'Market size, investment & budgets' },
  { label: 'Government Budgets', href: '/government-budgets', description: 'Global space agency budget tracking' },
  { label: 'Space Capital', href: '/space-capital', description: 'VC investors, startups & matchmaking' },
  { label: 'Investor Hub', href: '/investors', description: 'Due diligence tools & deal flow' },
  { label: 'Investment Tracker', href: '/investment-tracker', description: 'Funding trends, top deals & investors' },
  { label: 'Market Sizing (TAM)', href: '/market-sizing', description: 'Interactive market size analysis' },
  { label: 'Funding Tracker', href: '/funding-tracker', description: 'Live funding rounds & M&A deals' },
  { label: 'Executive Moves', href: '/executive-moves', description: 'Leadership changes across the industry' },
  { label: 'Regulatory Hub', href: '/compliance', description: 'Compliance, space law & filings' },
  { label: 'Space Law & Treaties', href: '/compliance?tab=treaties', description: '20+ international treaties and regulatory frameworks' },
  { label: 'Regulatory Risk', href: '/regulatory-risk', description: 'Jurisdiction risk scoring & alerts' },
  { label: 'Regulation Explainers', href: '/regulation-explainers', description: 'AI plain-English regulation summaries' },
  { label: 'Spectrum Management', href: '/spectrum', description: 'Allocations, auctions & filings' },
  { label: 'Patent & IP Tracker', href: '/patents', description: 'Space technology patent trends' },
  { label: 'Startup Tracker', href: '/startup-tracker', description: 'Emerging space companies & funding stages' },
  { label: 'Report Cards', href: '/report-cards', description: 'Quarterly company performance grades' },
  { label: 'Portfolio Tracker', href: '/portfolio-tracker', description: 'Track space investment portfolios' },
  { label: 'Industry Trends', href: '/industry-trends', description: 'Data-backed space industry trend analysis' },
  { label: 'Contract Awards', href: '/contract-awards', description: 'Government contract feed' },
  { label: 'Tech Readiness', href: '/tech-readiness', description: 'Technology readiness levels' },
  { label: 'Frequency Database', href: '/frequency-database', description: 'Searchable satellite frequency allocations' },
  { label: 'Ground Stations', href: '/ground-station-directory', description: 'Global ground station directory & capabilities' },
  { label: 'Launch Economics', href: '/launch-economics', description: 'Launch cost trends & pricing analysis' },
  { label: 'RF Spectrum', href: '/rf-spectrum', description: 'RF spectrum analysis & interference mapping' },
  { label: 'Edge Computing', href: '/space-edge-computing', description: 'Space edge computing & on-orbit processing' },
  { label: 'Market Segments', href: '/market-segments', description: 'Space industry market segment analysis' },
  { label: 'Patent Landscape', href: '/patent-landscape', description: 'Patent analytics & IP landscape mapping' },
  { label: 'Workforce Analytics', href: '/workforce-analytics', description: 'Space workforce trends & talent data' },
];

const BUSINESS_ITEMS: DropdownItem[] = [
  { label: 'Business Opportunities', href: '/business-opportunities', description: 'AI-powered opportunity discovery' },
  { label: 'Deal Flow', href: '/deal-flow', description: 'Investment deals, M&A & partnerships' },
  { label: 'Contract Awards', href: '/contract-awards', description: 'Government & commercial contract tracker' },
  { label: 'Funding Opportunities', href: '/funding-opportunities', description: 'Grants, SBIR/STTR & government funding' },
  { label: 'Business Model Tools', href: '/business-models', description: 'Unit economics & revenue modeling' },
  { label: 'Customer Discovery', href: '/customer-discovery', description: 'Market segments & buyer personas' },
  { label: 'Space Talent Hub', href: '/space-talent', description: 'Jobs, experts & workforce analytics' },
  { label: 'Space Jobs Board', href: '/jobs', description: 'Browse and post space industry jobs' },
  { label: 'Space Events', href: '/space-events', description: 'Conferences, demos & networking' },
  { label: 'Global Supply Chain', href: '/supply-chain', description: 'Aerospace supply chain & shortage alerts' },
  { label: 'Supply Chain Map', href: '/supply-chain-map', description: 'Interactive supplier relationship map' },
  { label: 'Space Mining', href: '/space-mining', description: 'Asteroid and planetary mining intelligence' },
  { label: 'Space Insurance', href: '/space-insurance', description: 'Risk calculator and market data' },
  { label: 'Manufacturing & Imagery', href: '/space-manufacturing', description: 'In-space manufacturing & EO providers' },
  { label: 'Supply Chain Risk', href: '/supply-chain-risk', description: 'Supplier risk scoring & disruption alerts' },
  { label: 'Funding Rounds', href: '/funding-rounds', description: 'Startup funding rounds & investment data' },
  { label: 'M&A Tracker', href: '/ma-tracker', description: 'Mergers & acquisitions deal tracking' },
  { label: 'Conferences', href: '/conferences', description: 'Space industry conferences & events calendar' },
  { label: 'Case Studies', href: '/case-studies', description: 'Success stories from space organizations' },
  { label: 'Security & Trust', href: '/security', description: 'How we protect your data' },
  { label: 'Book a Demo', href: '/book-demo', description: 'Schedule a personalized walkthrough' },
  { label: 'API Access', href: '/api-access', description: 'REST API for space intelligence data' },
  { label: 'Advertise', href: '/advertise', description: 'Sponsorship tiers for space industry brands' },
];

const TOOLS_ITEMS: DropdownItem[] = [
  { label: 'Engineering Tools Hub', href: '/tools', description: 'All calculators and analysis tools' },
  { label: 'Comparison Tools', href: '/compare', description: 'Side-by-side vehicle, satellite & company analysis' },
  { label: 'Mission Cost Simulator', href: '/mission-cost', description: 'Estimate launch costs and fees' },
  { label: 'Launch Cost Calculator', href: '/launch-cost-calculator', description: 'Estimate launch costs by vehicle & orbit' },
  { label: 'Launch Vehicle Comparison', href: '/launch-vehicles', description: 'Compare rocket specs and costs' },
  { label: 'Satellite Tracker', href: '/satellites', description: 'Track ISS, Starlink & weather satellites' },
  { label: 'Space Station Tracker', href: '/space-stations', description: 'ISS, Tiangong & commercial stations' },
  { label: 'Orbital Management', href: '/orbital-slots', description: 'Orbital slots and satellite services' },
  { label: 'Constellation Tracker', href: '/constellations', description: 'Satellite constellation monitoring' },
  { label: 'Ground Stations', href: '/ground-stations', description: 'Global ground station networks' },
  { label: 'Infrastructure Network', href: '/spaceports', description: 'Spaceports & communications networks' },
  { label: 'Resource Exchange', href: '/resource-exchange', description: 'Space commodity pricing' },
  { label: 'Launch Windows', href: '/launch-windows', description: 'Optimal launch timing' },
  { label: 'Space Environment', href: '/space-environment', description: 'Weather, debris & operations' },
  { label: 'Blueprint Series', href: '/blueprints', description: 'Technical hardware breakdowns' },
  { label: 'Investment Thesis AI', href: '/investment-thesis', description: 'AI-generated investment theses' },
  { label: 'Deal Rooms', href: '/deal-rooms', description: 'Secure document sharing for deals' },
  { label: 'My Watchlists', href: '/my-watchlists', description: 'Watched companies & saved searches' },
  { label: 'Dashboard', href: '/dashboard', description: 'Your personalized hub' },
  { label: 'Tech Readiness', href: '/tech-readiness', description: 'Emerging technology TRL tracking' },
  { label: 'Regulations Explorer', href: '/regulations', description: 'Searchable space regulations database' },
  { label: 'Satellite Bus Comparison', href: '/compare/satellite-buses', description: 'Compare satellite platform specs' },
  { label: 'Propulsion Database', href: '/propulsion-database', description: 'Engine & thruster specifications' },
  { label: 'Launch Sites', href: '/launch-sites', description: 'Global spaceport database & capabilities' },
  { label: 'Frequency Bands', href: '/frequency-bands', description: 'Space communications RF spectrum reference' },
  { label: 'Materials Database', href: '/materials-database', description: 'Spacecraft materials & properties reference' },
  { label: '🏗️ ISRU Resource Utilization', href: '/isru', description: 'In-situ resource utilization analysis' },
  { label: '📡 Space Communications', href: '/space-comms', description: 'Satellite link budgets & communication systems' },
  { label: 'Constellation Designer', href: '/constellation-designer', description: 'Design satellite constellations' },
  { label: 'Unit Economics', href: '/unit-economics', description: 'Revenue modeling calculator' },
  { label: 'Orbital Calculator', href: '/orbital-calculator', description: 'Orbital mechanics calculator' },
  { label: 'Mission Simulator', href: '/mission-simulator', description: 'Simulate and plan space missions' },
  { label: 'Radiation Calculator', href: '/radiation-calculator', description: 'Space radiation dose & shielding estimator' },
  { label: 'Reading List', href: '/reading-list', description: 'Your saved articles' },
  { label: 'Standards Reference', href: '/standards-reference', description: 'Space industry standards & specifications' },
  { label: 'Thermal Calculator', href: '/thermal-calculator', description: 'Spacecraft thermal analysis tool' },
  { label: 'Clean Room Guide', href: '/clean-room-reference', description: 'Clean room classifications & requirements' },
  { label: 'Education Pathways', href: '/education-pathways', description: 'Space industry degree & training programs' },
  { label: 'Satellite Buses', href: '/satellite-bus-comparison', description: 'Satellite bus platform comparison tool' },
  { label: 'Propulsion Comparison', href: '/propulsion-comparison', description: 'Compare rocket engines & propulsion systems' },
];

// Wire up items to category metadata after const arrays are defined
ALL_CATEGORIES[0].items = EXPLORE_ITEMS;
ALL_CATEGORIES[1].items = INTELLIGENCE_ITEMS;
ALL_CATEGORIES[2].items = BUSINESS_ITEMS;
ALL_CATEGORIES[3].items = TOOLS_ITEMS;

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
          className={`absolute top-full left-0 mt-3 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden animate-fade-in-down z-50 ${items.length > 12 ? 'w-[32rem]' : 'w-72'}`}
          style={{ background: 'rgba(0, 0, 0, 0.95)', boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.5)' }}
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Mobile menu state
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);
  const [showAllItems, setShowAllItems] = useState<Record<CategoryKey, boolean>>({
    explore: false,
    intelligence: false,
    business: false,
    tools: false,
  });
  const [recentModules, setRecentModules] = useState<RecentModule[]>([]);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

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
    const allItems = [...EXPLORE_ITEMS, ...INTELLIGENCE_ITEMS, ...BUSINESS_ITEMS, ...TOOLS_ITEMS];
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
      setShowAllItems({ explore: false, intelligence: false, business: false, tools: false });
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
      className={`nav-persistent sticky top-0 z-50 transition-all duration-300 backdrop-blur-xl safe-area-pt ${navHidden ? '-translate-y-full' : 'translate-y-0'}`}
      style={{
        background: scrolled
          ? 'rgba(0, 0, 0, 0.95)'
          : 'rgba(0, 0, 0, 0.85)',
        boxShadow: scrolled
          ? '0 4px 24px -4px rgba(0, 0, 0, 0.4)'
          : 'none'
      }}
    >
      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.06]" />

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo + Home */}
          <Link href="/" className="flex items-center gap-2 opacity-90 hover:opacity-100 transition-opacity">
            <Image
              src="/spacenexus-logo.png"
              alt="SpaceNexus logo"
              width={160}
              height={80}
              className="h-5 w-auto"
              priority
            />
            <span className="text-white/90 hover:text-white text-sm font-medium transition-colors">Home</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            <DropdownMenu
              label="Explore"
              items={EXPLORE_ITEMS}
              isOpen={openDropdown === 'explore'}
              onToggle={() => toggleDropdown('explore')}
              isPro={isPro}
            />
            <DropdownMenu
              label="Intelligence"
              items={INTELLIGENCE_ITEMS}
              isOpen={openDropdown === 'intelligence'}
              onToggle={() => toggleDropdown('intelligence')}
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
              label="Tools"
              items={TOOLS_ITEMS}
              isOpen={openDropdown === 'tools'}
              onToggle={() => toggleDropdown('tools')}
              isPro={isPro}
            />
            <Link
              href="/pricing"
              className="text-white/90 hover:text-white transition-colors text-sm font-medium"
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
          <div className="hidden lg:flex items-center space-x-3">
            {!isPro && (
              <Link
                href="/pricing"
                className="text-white/70 hover:text-white text-sm font-medium transition-colors"
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
              aria-label="Search (Ctrl+K)"
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
              <span className="text-xs text-slate-500">Search</span>
              <kbd className="hidden xl:inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 bg-white/[0.03] border border-white/[0.08] rounded text-[10px] font-mono text-slate-500">
                Ctrl+K
              </kbd>
            </button>
            {/* Keyboard Shortcuts */}
            <button
              onClick={() => {
                const opener = (window as unknown as Record<string, unknown>).__openKeyboardShortcuts;
                if (typeof opener === 'function') {
                  (opener as () => void)();
                }
              }}
              className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              aria-label="Keyboard shortcuts (?)"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 10h0m4 0h0m4 0h0m4 0h0M8 14h8" />
              </svg>
            </button>
            {/* High Contrast Toggle */}
            <button
              onClick={toggleHighContrast}
              className={`relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors group ${
                isHighContrast
                  ? 'text-white/90 bg-white/[0.06]'
                  : 'text-slate-400 hover:text-white/90 hover:bg-white/[0.05]'
              }`}
              aria-label="Toggle high contrast mode"
              aria-pressed={isHighContrast}
            >
              {/* Eye / contrast icon */}
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
              </svg>
            </button>
            {/* Reading List */}
            <Link
              href="/reading-list"
              className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              aria-label="Reading List"
              title="Reading List"
            >
              <svg
                className="w-4 h-4"
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
            </Link>
            {/* Recently Viewed */}
            <RecentlyViewed />
            {/* Notification Center */}
            <NotificationBell />
            <NotificationCenter />
            {status === 'loading' ? (
              <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : session ? (
              <div className="flex items-center space-x-3">
                {isPro && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/70 border border-white/10">
                    PRO
                  </span>
                )}
                <span className="text-white/70 text-sm">
                  {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-white/70 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors ease-smooth"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-white/70 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors ease-smooth">
                  Sign In
                </Link>
                <Link href="/register" className="bg-white text-slate-900 font-medium text-xs py-2 px-5 rounded-lg hover:bg-slate-100 transition-all duration-200 ease-smooth">
                  Get Started
                </Link>
                <Link href="/register?trial=true" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium text-xs py-2 px-5 rounded-lg transition-all duration-200 ease-smooth shadow-lg shadow-cyan-500/20">
                  Start Free Trial
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
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] backdrop-blur-xl border-l border-white/[0.06] overflow-y-auto animate-slide-in-right" style={{ background: 'rgba(0, 0, 0, 0.97)', boxShadow: '-8px 0 32px -4px rgba(0, 0, 0, 0.5)' }}>
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
                      onClick={() => setIsMenuOpen(false)}
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

