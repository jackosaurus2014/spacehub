'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  id: string;
  name: string;
  icon: string;
  href: string;
}

const MOBILE_NAV_ITEMS: NavItem[] = [
  {
    id: 'mission-control',
    name: 'Missions',
    icon: 'target',
    href: '/mission-control',
  },
  {
    id: 'news',
    name: 'News',
    icon: 'newspaper',
    href: '/news',
  },
  {
    id: 'market-intel',
    name: 'Market',
    icon: 'chart',
    href: '/market-intel',
  },
  {
    id: 'solar-flares',
    name: 'Solar',
    icon: 'sun',
    href: '/solar-flares',
  },
  {
    id: 'dashboard',
    name: 'Hub',
    icon: 'grid',
    href: '/dashboard',
  },
];

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const strokeColor = active ? 'currentColor' : 'currentColor';

  switch (icon) {
    case 'target':
      return (
        <svg className="w-6 h-6" fill="none" stroke={strokeColor} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
          <circle cx="12" cy="12" r="6" strokeWidth={2} />
          <circle cx="12" cy="12" r="2" fill={active ? strokeColor : 'none'} strokeWidth={2} />
        </svg>
      );
    case 'newspaper':
      return (
        <svg className="w-6 h-6" fill="none" stroke={strokeColor} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      );
    case 'chart':
      return (
        <svg className="w-6 h-6" fill="none" stroke={strokeColor} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'sun':
      return (
        <svg className="w-6 h-6" fill="none" stroke={strokeColor} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" strokeWidth={2} />
          <path strokeLinecap="round" strokeWidth={2} d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    case 'grid':
      return (
        <svg className="w-6 h-6" fill="none" stroke={strokeColor} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        background: 'linear-gradient(0deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 100%)',
        boxShadow: '0 -4px 16px -4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(6, 182, 212, 0.15)',
      }}
    >
      {/* Top gradient border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

      <div className="flex items-center justify-around h-16 px-2 safe-area-pb">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full px-2 transition-all duration-200 ${
                active
                  ? 'text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 active:text-cyan-400'
              }`}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute top-0 w-12 h-0.5 rounded-b-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
              )}

              {/* Icon */}
              <div className={`relative transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                <NavIcon icon={item.icon} active={active} />
                {active && (
                  <div className="absolute inset-0 blur-md opacity-50">
                    <NavIcon icon={item.icon} active={active} />
                  </div>
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-1 text-[10px] font-medium transition-colors duration-200 ${
                  active ? 'text-cyan-400' : 'text-slate-500'
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
