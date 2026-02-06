'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { useSubscription } from './SubscriptionProvider';
import NotificationCenter from './NotificationCenter';

interface DropdownItem {
  label: string;
  href: string;
  description: string;
}

const EXPLORE_ITEMS: DropdownItem[] = [
  { label: 'Mission Control', href: '/mission-control', description: 'Upcoming launches and events' },
  { label: 'Live Launch Hub', href: '/live', description: 'Watch launches live with telemetry' },
  { label: 'Solar Exploration', href: '/solar-exploration', description: '3D planetary visualization' },
  { label: 'News', href: '/news', description: 'Latest space industry updates' },
];

const INTELLIGENCE_ITEMS: DropdownItem[] = [
  { label: 'Market Intel', href: '/market-intel', description: 'Companies and stock tracking' },
  { label: 'Blogs', href: '/blogs', description: 'Expert industry insights' },
];

const BUSINESS_ITEMS: DropdownItem[] = [
  { label: 'Business Opportunities', href: '/business-opportunities', description: 'AI-powered opportunity discovery' },
  { label: 'Space Tourism', href: '/space-tourism', description: 'Compare space tourism experiences' },
  { label: 'Global Supply Chain', href: '/supply-chain', description: 'Aerospace supply chain & shortage alerts' },
  { label: 'Spectrum Tracker', href: '/spectrum', description: 'Frequency allocations and filings' },
  { label: 'Space Insurance', href: '/space-insurance', description: 'Risk calculator and market data' },
  { label: 'Space Workforce', href: '/workforce', description: 'Talent trends and salary benchmarks' },
];

const TOOLS_ITEMS: DropdownItem[] = [
  { label: 'Resource Exchange', href: '/resource-exchange', description: 'Space commodity pricing' },
  { label: 'Compliance', href: '/compliance', description: 'Export controls and regulations' },
  { label: 'Solar Flares', href: '/solar-flares', description: 'Real-time solar activity' },
  { label: 'Debris Monitor', href: '/', description: 'Collision risk and tracking' },
  { label: 'Orbital Slots', href: '/', description: 'Satellite population by orbit' },
  { label: 'Dashboard', href: '/dashboard', description: 'Your personalized hub' },
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (isOpen) onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className="text-slate-200 hover:text-cyan-300 transition-colors text-sm font-medium flex items-center gap-1"
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-64 backdrop-blur-xl border border-cyan-400/30 rounded-xl overflow-hidden animate-fade-in-down z-50" style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 25%, rgba(51, 65, 85, 0.95) 50%, rgba(30, 41, 59, 0.96) 75%, rgba(15, 23, 42, 0.98) 100%)', boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(6, 182, 212, 0.15)' }}>
          <div className="p-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2.5 rounded-lg hover:bg-slate-700/50 transition-colors group"
                onClick={onToggle}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 text-sm font-medium group-hover:text-cyan-300 transition-colors">
                    {item.label}
                  </span>
                  {item.href === '/compliance' && !isPro && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs mt-0.5">{item.description}</p>
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
  const { tier, isPro } = useSubscription();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-xl`}
      style={{
        background: scrolled
          ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.92) 25%, rgba(51, 65, 85, 0.9) 50%, rgba(30, 41, 59, 0.92) 75%, rgba(15, 23, 42, 0.95) 100%)'
          : 'linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.8) 25%, rgba(51, 65, 85, 0.75) 50%, rgba(30, 41, 59, 0.8) 75%, rgba(15, 23, 42, 0.85) 100%)',
        boxShadow: scrolled
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 10px 20px -5px rgba(0, 0, 0, 0.4), inset 0 -1px 0 rgba(6, 182, 212, 0.2)'
          : 'inset 0 -1px 0 rgba(6, 182, 212, 0.15)'
      }}
    >
      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center opacity-90 hover:opacity-100 transition-opacity">
            <Image
              src="/spacenexus-logo.png"
              alt="SpaceNexus"
              width={160}
              height={80}
              className="h-5 w-auto"
              priority
            />
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
              className="text-slate-200 hover:text-cyan-300 transition-colors text-sm font-medium"
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
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
              >
                Upgrade
              </Link>
            )}
            {/* Notification Center */}
            <NotificationCenter />
            {status === 'loading' ? (
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : session ? (
              <div className="flex items-center space-x-3">
                {isPro && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    PRO
                  </span>
                )}
                <span className="text-slate-300 text-sm">
                  {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-slate-300 hover:text-cyan-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-slate-300 hover:text-cyan-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary text-xs py-2 px-5">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-2">
            <NotificationCenter />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-slate-300 hover:text-cyan-300"
            >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-[72px] z-50 animate-fade-in">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] backdrop-blur-xl border-l border-cyan-400/30 overflow-y-auto animate-slide-in-right" style={{ background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 25%, rgba(51, 65, 85, 0.95) 50%, rgba(30, 41, 59, 0.96) 75%, rgba(15, 23, 42, 0.98) 100%)', boxShadow: '-8px 0 16px -4px rgba(0, 0, 0, 0.4), -20px 0 40px -10px rgba(0, 0, 0, 0.5)' }}>
              <div className="p-6 space-y-6">
                {/* Explore Section */}
                <div>
                  <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-medium mb-3">Explore</h3>
                  <div className="space-y-1">
                    {EXPLORE_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        <p className="text-slate-400 text-xs mt-0.5">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Intelligence Section */}
                <div>
                  <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-medium mb-3">Intelligence</h3>
                  <div className="space-y-1">
                    {INTELLIGENCE_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        <p className="text-slate-400 text-xs mt-0.5">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Business Section */}
                <div>
                  <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-medium mb-3">Business</h3>
                  <div className="space-y-1">
                    {BUSINESS_ITEMS.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="block px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        <p className="text-slate-400 text-xs mt-0.5">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Tools Section */}
                <div>
                  <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-medium mb-3">Tools</h3>
                  <div className="space-y-1">
                    {TOOLS_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.href === '/compliance' && !isPro && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {session?.user?.isAdmin && (
                  <div>
                    <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-medium mb-3">Admin</h3>
                    <Link
                      href="/admin"
                      className="block px-3 py-2.5 rounded-lg text-amber-400 hover:bg-slate-700/50 hover:text-amber-300 transition-colors text-sm font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  </div>
                )}

                {/* Auth Section */}
                <div className="pt-4 border-t border-slate-700/50 space-y-2">
                  {!isPro && (
                    <Link
                      href="/pricing"
                      className="block text-cyan-400 hover:text-cyan-300 font-medium text-center py-2 text-sm"
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
                      className="w-full text-sm py-2 px-4 rounded-lg border border-cyan-400/30 text-slate-200 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="block text-sm py-2 px-4 text-center rounded-lg text-slate-200 hover:bg-slate-700/50 hover:text-cyan-300 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/register"
                        className="btn-primary text-sm py-2 px-4 text-center block"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Register
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

