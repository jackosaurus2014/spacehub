'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandPaletteShortcut, usePlatformModifier } from '@/hooks/useKeyboardShortcut';

// Search item types
type SearchItemType = 'module' | 'page' | 'recent' | 'result';

interface SearchItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  type: SearchItemType;
  category?: string;
}

// Icons for different modules
const RocketIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const NewspaperIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
  </svg>
);

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
  </svg>
);

const CubeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const SatelliteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
  </svg>
);

const CircleStackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
);

const DebrisIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </svg>
);

const SignalIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const DocumentTextIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);

const Squares2x2Icon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

const CogIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MagnifyingGlassIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

// All searchable items
const ALL_SEARCH_ITEMS: SearchItem[] = [
  // Explore
  {
    id: 'mission-control',
    label: 'Mission Control',
    description: 'Upcoming launches and events',
    href: '/mission-control',
    icon: <RocketIcon />,
    type: 'module',
    category: 'Explore',
  },
  {
    id: 'solar-exploration',
    label: 'Solar Exploration',
    description: '3D planetary visualization',
    href: '/solar-exploration',
    icon: <GlobeIcon />,
    type: 'module',
    category: 'Explore',
  },
  {
    id: 'news',
    label: 'News',
    description: 'Latest space industry updates',
    href: '/news',
    icon: <NewspaperIcon />,
    type: 'module',
    category: 'Explore',
  },
  // Intelligence
  {
    id: 'market-intel',
    label: 'Market Intel',
    description: 'Companies and stock tracking',
    href: '/market-intel',
    icon: <ChartIcon />,
    type: 'module',
    category: 'Intelligence',
  },
  {
    id: 'blogs',
    label: 'Blogs',
    description: 'Expert industry insights',
    href: '/blogs',
    icon: <DocumentTextIcon />,
    type: 'module',
    category: 'Intelligence',
  },
  {
    id: 'company-profiles',
    label: 'Company Directory',
    description: 'Space company intelligence profiles',
    href: '/company-profiles',
    icon: <ChartIcon />,
    type: 'module',
    category: 'Intelligence',
  },
  // Business
  {
    id: 'business-opportunities',
    label: 'Business Opportunities',
    description: 'AI-powered opportunity discovery',
    href: '/business-opportunities',
    icon: <BriefcaseIcon />,
    type: 'module',
    category: 'Business',
  },
  {
    id: 'spectrum',
    label: 'Spectrum Management',
    description: 'Allocations, auctions & filings',
    href: '/spectrum',
    icon: <SignalIcon />,
    type: 'module',
    category: 'Intelligence',
  },
  {
    id: 'space-insurance',
    label: 'Space Insurance',
    description: 'Risk calculator and market data',
    href: '/space-insurance',
    icon: <ShieldCheckIcon />,
    type: 'module',
    category: 'Business',
  },
  {
    id: 'space-talent',
    label: 'Space Talent Hub',
    description: 'Jobs, experts & workforce analytics',
    href: '/space-talent',
    icon: <UsersIcon />,
    type: 'module',
    category: 'Business',
  },
  // Tools
  {
    id: 'resource-exchange',
    label: 'Resource Exchange',
    description: 'Space commodity pricing',
    href: '/resource-exchange',
    icon: <CubeIcon />,
    type: 'module',
    category: 'Tools',
  },
  {
    id: 'regulatory-hub',
    label: 'Regulatory Hub',
    description: 'Compliance, space law & filings',
    href: '/compliance',
    icon: <ShieldIcon />,
    type: 'module',
    category: 'Tools',
  },
  {
    id: 'space-environment',
    label: 'Space Environment',
    description: 'Weather, debris & operations',
    href: '/space-environment',
    icon: <SunIcon />,
    type: 'module',
    category: 'Tools',
  },
  {
    id: 'orbital-management',
    label: 'Orbital Management',
    description: 'Orbital slots and satellite services',
    href: '/orbital-slots',
    icon: <CircleStackIcon />,
    type: 'module',
    category: 'Tools',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Your personalized hub',
    href: '/dashboard',
    icon: <Squares2x2Icon />,
    type: 'page',
    category: 'Pages',
  },
  // Pages
  {
    id: 'pricing',
    label: 'Pricing',
    description: 'Subscription plans and features',
    href: '/pricing',
    icon: <CreditCardIcon />,
    type: 'page',
    category: 'Pages',
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Administration panel',
    href: '/admin',
    icon: <CogIcon />,
    type: 'page',
    category: 'Pages',
  },
];

const RECENT_SEARCHES_KEY = 'spacenexus-recent-searches';
const MAX_RECENT_SEARCHES = 5;

// Server search result types
interface ServerSearchResults {
  news: Array<{ id: string; title: string; summary: string | null; url: string }>;
  companies: Array<{ id: string; slug: string; name: string; description: string | null; headquarters: string | null; sector: string | null; ticker: string | null }>;
  events: Array<{ id: string; name: string; description: string | null; type: string }>;
  opportunities: Array<{ id: string; slug: string; title: string; description: string | null }>;
  blogs: Array<{ id: string; title: string; excerpt: string | null; url: string }>;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SearchCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [serverResults, setServerResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const platformModifier = usePlatformModifier();

  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch {
          setRecentSearches([]);
        }
      }
    }
  }, []);

  // Server-side search
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setServerResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=5`)
      .then((res) => res.json())
      .then((data: ServerSearchResults) => {
        if (cancelled) return;

        const items: SearchItem[] = [];

        data.news?.forEach((item) => {
          items.push({
            id: `news-${item.id}`,
            label: item.title,
            description: item.summary?.slice(0, 80) || 'News article',
            href: item.url,
            icon: <NewspaperIcon />,
            type: 'result',
            category: 'News Results',
          });
        });

        data.companies?.forEach((item) => {
          const desc = [
            item.sector?.replace(/_/g, ' '),
            item.headquarters,
            item.ticker ? `(${item.ticker})` : null,
          ].filter(Boolean).join(' · ') || item.description?.slice(0, 80) || 'Space company';
          items.push({
            id: `company-${item.id}`,
            label: item.name,
            description: desc,
            href: `/company-profiles/${item.slug}`,
            icon: <ChartIcon />,
            type: 'result',
            category: 'Company Results',
          });
        });

        data.events?.forEach((item) => {
          items.push({
            id: `event-${item.id}`,
            label: item.name,
            description: item.description?.slice(0, 80) || item.type,
            href: '/mission-control',
            icon: <RocketIcon />,
            type: 'result',
            category: 'Event Results',
          });
        });

        data.opportunities?.forEach((item) => {
          items.push({
            id: `opportunity-${item.id}`,
            label: item.title,
            description: item.description?.slice(0, 80) || 'Business opportunity',
            href: `/business-opportunities/${item.slug}`,
            icon: <BriefcaseIcon />,
            type: 'result',
            category: 'Opportunity Results',
          });
        });

        data.blogs?.forEach((item) => {
          items.push({
            id: `blog-${item.id}`,
            label: item.title,
            description: item.excerpt?.slice(0, 80) || 'Blog post',
            href: item.url,
            icon: <DocumentTextIcon />,
            type: 'result',
            category: 'Blog Results',
          });
        });

        setServerResults(items);
        setIsSearching(false);
      })
      .catch(() => {
        if (!cancelled) {
          setServerResults([]);
          setIsSearching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isOpen]);

  // Save recent search
  const saveRecentSearch = useCallback((itemId: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((id) => id !== itemId);
      const updated = [itemId, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Filter items based on query (client-side navigation search)
  const filteredItems = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();

    // If no query, show recent searches first, then all items
    if (!lowerQuery) {
      const recentItems: SearchItem[] = recentSearches
        .map((id) => ALL_SEARCH_ITEMS.find((item) => item.id === id))
        .filter((item): item is SearchItem => item !== undefined)
        .map((item) => ({ ...item, type: 'recent' as SearchItemType }));

      const otherItems = ALL_SEARCH_ITEMS.filter(
        (item) => !recentSearches.includes(item.id)
      );

      return [...recentItems, ...otherItems];
    }

    // Filter by query
    return ALL_SEARCH_ITEMS.filter((item) => {
      const labelMatch = item.label.toLowerCase().includes(lowerQuery);
      const descMatch = item.description.toLowerCase().includes(lowerQuery);
      const categoryMatch = item.category?.toLowerCase().includes(lowerQuery);
      return labelMatch || descMatch || categoryMatch;
    });
  }, [query, recentSearches]);

  // Combine client-side and server-side results
  const allItems = useMemo(() => {
    return [...filteredItems, ...serverResults];
  }, [filteredItems, serverResults]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};

    allItems.forEach((item) => {
      const category = item.type === 'recent' ? 'Recent' : (item.category || 'Other');
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    return groups;
  }, [allItems]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => {
    return Object.values(groupedItems).flat();
  }, [groupedItems]);

  // Open/close handlers
  const openPalette = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
    setServerResults([]);
    setIsSearching(false);
  }, []);

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
    setServerResults([]);
    setIsSearching(false);
  }, []);

  // Register keyboard shortcut
  useCommandPaletteShortcut(openPalette, !isOpen);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle item selection
  const handleSelect = useCallback(
    (item: SearchItem) => {
      // Only save navigation items to recent searches (not server results)
      if (item.type !== 'result') {
        saveRecentSearch(item.id);
      }
      closePalette();
      // External URLs (news articles, blog posts) open in new tab
      if (item.href.startsWith('http')) {
        window.open(item.href, '_blank', 'noopener,noreferrer');
      } else {
        router.push(item.href);
      }
    },
    [saveRecentSearch, closePalette, router]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            handleSelect(flatItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          closePalette();
          break;
      }
    },
    [flatItems, selectedIndex, handleSelect, closePalette]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatItems.length > 0) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, flatItems.length]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const shortcutKey = platformModifier === 'meta' ? 'Cmd' : 'Ctrl';

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[8vh] sm:pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closePalette}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl mx-4 overflow-hidden rounded-2xl border border-cyan-400/40 animate-scale-in"
        style={{
          background:
            'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 25%, rgba(51, 65, 85, 0.95) 50%, rgba(30, 41, 59, 0.96) 75%, rgba(15, 23, 42, 0.98) 100%)',
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 60px rgba(6, 182, 212, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-cyan-400/20">
          <svg
            className="w-5 h-5 text-cyan-400 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, pages, content..."
            className="flex-1 py-4 bg-transparent text-slate-100 placeholder-slate-400 text-lg focus:outline-none"
          />
          {isSearching && (
            <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mr-3" />
          )}
          <div className="flex items-center gap-1 text-slate-400 text-sm">
            <kbd className="px-2 py-1 rounded bg-slate-700/50 border border-slate-600/50 text-xs font-mono">
              {shortcutKey}
            </kbd>
            <kbd className="px-2 py-1 rounded bg-slate-700/50 border border-slate-600/50 text-xs font-mono">
              K
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto py-2 scrollbar-thin"
        >
          {flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400/80">
                    {category}
                  </span>
                </div>
                {items.map((item) => {
                  const index = flatItems.indexOf(item);
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={`${category}-${item.id}`}
                      data-index={index}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-cyan-400/10 border-l-2 border-cyan-400'
                          : 'border-l-2 border-transparent hover:bg-slate-700/30'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-cyan-400/20 text-cyan-300'
                            : 'bg-slate-700/50 text-slate-400'
                        }`}
                      >
                        {item.type === 'recent' ? <ClockIcon /> : item.type === 'result' ? <MagnifyingGlassIcon /> : item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              isSelected ? 'text-cyan-300' : 'text-slate-200'
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.type === 'recent' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                              Recent
                            </span>
                          )}
                          {item.type === 'result' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              Content
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 truncate">
                          {item.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0 flex items-center gap-1 text-slate-400">
                          <kbd className="px-1.5 py-0.5 rounded bg-slate-700/50 border border-slate-600/50 text-[10px] font-mono">
                            Enter
                          </kbd>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-cyan-400/20 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-700/50 border border-slate-600/50 font-mono">
                &uarr;
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-700/50 border border-slate-600/50 font-mono">
                &darr;
              </kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-700/50 border border-slate-600/50 font-mono">
                Enter
              </kbd>
              <span className="ml-1">Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-700/50 border border-slate-600/50 font-mono">
                Esc
              </kbd>
              <span className="ml-1">Close</span>
            </span>
          </div>
          <span className="text-cyan-400/60">SpaceNexus</span>
        </div>
      </div>
    </div>
  );
}
