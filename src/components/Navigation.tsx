'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { useSubscription } from './SubscriptionProvider';

interface DropdownItem {
  label: string;
  href: string;
  description: string;
}

const EXPLORE_ITEMS: DropdownItem[] = [
  { label: 'Mission Control', href: '/mission-control', description: 'Upcoming launches and events' },
  { label: 'Solar Exploration', href: '/solar-exploration', description: '3D planetary visualization' },
  { label: 'News', href: '/news', description: 'Latest space industry updates' },
];

const INTELLIGENCE_ITEMS: DropdownItem[] = [
  { label: 'Market Intel', href: '/market-intel', description: 'Companies and stock tracking' },
  { label: 'Blogs', href: '/blogs', description: 'Expert industry insights' },
];

const BUSINESS_ITEMS: DropdownItem[] = [
  { label: 'Business Opportunities', href: '/business-opportunities', description: 'AI-powered opportunity discovery' },
  { label: 'Spectrum Tracker', href: '/', description: 'Frequency allocations and filings' },
  { label: 'Space Insurance', href: '/', description: 'Risk calculator and market data' },
  { label: 'Space Workforce', href: '/', description: 'Talent trends and salary benchmarks' },
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
        className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium flex items-center gap-1"
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
        <div className="absolute top-full left-0 mt-3 w-64 backdrop-blur-xl border-2 border-white/70 rounded-xl overflow-hidden animate-fade-in-down z-50" style={{ background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 245, 255, 0.96) 25%, rgba(242, 248, 255, 0.95) 50%, rgba(245, 243, 255, 0.96) 75%, rgba(252, 250, 255, 0.98) 100%)', boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.12), 0 25px 50px -12px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9)' }}>
          <div className="p-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors group"
                onClick={onToggle}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 text-sm font-medium group-hover:text-slate-900 transition-colors">
                    {item.label}
                  </span>
                  {item.href === '/compliance' && !isPro && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-nebula-500/20 text-nebula-600 border border-nebula-500/30">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>
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
          ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 245, 255, 0.92) 25%, rgba(242, 248, 255, 0.9) 50%, rgba(245, 243, 255, 0.92) 75%, rgba(252, 250, 255, 0.95) 100%)'
          : 'linear-gradient(145deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 245, 255, 0.8) 25%, rgba(242, 248, 255, 0.78) 50%, rgba(245, 243, 255, 0.8) 75%, rgba(252, 250, 255, 0.85) 100%)',
        boxShadow: scrolled
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 10px 20px -5px rgba(139, 92, 246, 0.12), inset 0 -1px 0 rgba(139, 92, 246, 0.1)'
          : 'inset 0 -1px 0 rgba(139, 92, 246, 0.08)'
      }}
    >
      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nebula-400/30 to-transparent" />

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
              className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium"
            >
              Pricing
            </Link>
            {session?.user?.isAdmin && (
              <Link
                href="/admin"
                className="text-rocket-500 hover:text-rocket-600 transition-colors text-sm font-medium"
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
                className="text-nebula-600 hover:text-nebula-700 text-sm font-medium transition-colors"
              >
                Upgrade
              </Link>
            )}
            {status === 'loading' ? (
              <div className="w-8 h-8 border-2 border-nebula-500 border-t-transparent rounded-full animate-spin" />
            ) : session ? (
              <div className="flex items-center space-x-3">
                {isPro && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-nebula-500/20 text-nebula-600 border border-nebula-500/30">
                    PRO
                  </span>
                )}
                <span className="text-slate-600 text-sm">
                  {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="btn-ghost text-sm"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-sm">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary text-xs py-2 px-5">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-[72px] z-50 animate-fade-in">
            <div className="absolute inset-0 bg-black/30" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] backdrop-blur-xl border-l-2 border-white/70 overflow-y-auto animate-slide-in-right" style={{ background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 245, 255, 0.96) 25%, rgba(242, 248, 255, 0.95) 50%, rgba(245, 243, 255, 0.96) 75%, rgba(252, 250, 255, 0.98) 100%)', boxShadow: '-8px 0 16px -4px rgba(0, 0, 0, 0.1), -20px 0 40px -10px rgba(139, 92, 246, 0.15)' }}>
              <div className="p-6 space-y-6">
                {/* Explore Section */}
                <div>
                  <h3 className="text-slate-500 text-xs uppercase tracking-widest font-medium mb-3">Explore</h3>
                  <div className="space-y-1">
                    {EXPLORE_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Intelligence Section */}
                <div>
                  <h3 className="text-slate-500 text-xs uppercase tracking-widest font-medium mb-3">Intelligence</h3>
                  <div className="space-y-1">
                    {INTELLIGENCE_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Business Section */}
                <div>
                  <h3 className="text-slate-500 text-xs uppercase tracking-widest font-medium mb-3">Business</h3>
                  <div className="space-y-1">
                    {BUSINESS_ITEMS.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="block px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Tools Section */}
                <div>
                  <h3 className="text-slate-500 text-xs uppercase tracking-widest font-medium mb-3">Tools</h3>
                  <div className="space-y-1">
                    {TOOLS_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.href === '/compliance' && !isPro && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-nebula-500/20 text-nebula-600 border border-nebula-500/30">
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {session?.user?.isAdmin && (
                  <div>
                    <h3 className="text-slate-500 text-xs uppercase tracking-widest font-medium mb-3">Admin</h3>
                    <Link
                      href="/admin"
                      className="block px-3 py-2.5 rounded-lg text-rocket-500 hover:bg-slate-100 transition-colors text-sm font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  </div>
                )}

                {/* Auth Section */}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  {!isPro && (
                    <Link
                      href="/pricing"
                      className="block text-nebula-600 hover:text-nebula-700 font-medium text-center py-2 text-sm"
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
                      className="btn-secondary text-sm py-2 px-4 w-full"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="btn-ghost text-sm py-2 px-4 text-center block"
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
