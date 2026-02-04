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
  { label: 'Solar Flares', href: '/solar-flares', description: 'Real-time solar activity' },
  { label: 'News', href: '/news', description: 'Latest space industry updates' },
];

const INTELLIGENCE_ITEMS: DropdownItem[] = [
  { label: 'Market Intel', href: '/market-intel', description: 'Companies and stock tracking' },
  { label: 'Business Opportunities', href: '/business-opportunities', description: 'AI-powered opportunity discovery' },
  { label: 'Blogs', href: '/blogs', description: 'Expert industry insights' },
];

const TOOLS_ITEMS: DropdownItem[] = [
  { label: 'Resource Exchange', href: '/resource-exchange', description: 'Space commodity pricing' },
  { label: 'Compliance', href: '/compliance', description: 'Export controls and regulations' },
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
        className="text-star-300 hover:text-white transition-colors text-sm font-medium flex items-center gap-1"
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
        <div className="absolute top-full left-0 mt-3 w-64 bg-space-900/95 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in-down z-50">
          <div className="p-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition-colors group"
                onClick={onToggle}
              >
                <div className="flex items-center justify-between">
                  <span className="text-star-100 text-sm font-medium group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                  {item.href === '/compliance' && !isPro && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-nebula-500/20 text-nebula-300 border border-nebula-500/30">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-star-400 text-xs mt-0.5">{item.description}</p>
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
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-space-950/90 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nebula-500/20 to-transparent" />

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center opacity-90 hover:opacity-100 transition-opacity">
            <Image
              src="/spacenexus-logo.png"
              alt="SpaceNexus"
              width={160}
              height={80}
              className="h-10 w-auto"
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
              label="Tools"
              items={TOOLS_ITEMS}
              isOpen={openDropdown === 'tools'}
              onToggle={() => toggleDropdown('tools')}
              isPro={isPro}
            />
            <Link
              href="/pricing"
              className="text-star-300 hover:text-white transition-colors text-sm font-medium"
            >
              Pricing
            </Link>
            {session?.user?.isAdmin && (
              <Link
                href="/admin"
                className="text-rocket-400 hover:text-rocket-300 transition-colors text-sm font-medium"
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
                className="text-nebula-400 hover:text-nebula-300 text-sm font-medium transition-colors"
              >
                Upgrade
              </Link>
            )}
            {status === 'loading' ? (
              <div className="w-8 h-8 border-2 border-nebula-500 border-t-transparent rounded-full animate-spin" />
            ) : session ? (
              <div className="flex items-center space-x-3">
                {isPro && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-nebula-500/20 text-nebula-300 border border-nebula-500/30">
                    PRO
                  </span>
                )}
                <span className="text-star-400 text-sm">
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
            className="lg:hidden p-2 text-star-200 hover:text-white"
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
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-space-900/98 backdrop-blur-xl border-l border-white/[0.06] overflow-y-auto animate-slide-in-right">
              <div className="p-6 space-y-6">
                {/* Explore Section */}
                <div>
                  <h3 className="text-star-400 text-xs uppercase tracking-widest font-medium mb-3">Explore</h3>
                  <div className="space-y-1">
                    {EXPLORE_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2.5 rounded-lg text-star-100 hover:bg-white/[0.06] transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        <p className="text-star-400 text-xs mt-0.5">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Intelligence Section */}
                <div>
                  <h3 className="text-star-400 text-xs uppercase tracking-widest font-medium mb-3">Intelligence</h3>
                  <div className="space-y-1">
                    {INTELLIGENCE_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2.5 rounded-lg text-star-100 hover:bg-white/[0.06] transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        <p className="text-star-400 text-xs mt-0.5">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Tools Section */}
                <div>
                  <h3 className="text-star-400 text-xs uppercase tracking-widest font-medium mb-3">Tools</h3>
                  <div className="space-y-1">
                    {TOOLS_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2.5 rounded-lg text-star-100 hover:bg-white/[0.06] transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.href === '/compliance' && !isPro && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-nebula-500/20 text-nebula-300 border border-nebula-500/30">
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-star-400 text-xs mt-0.5">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {session?.user?.isAdmin && (
                  <div>
                    <h3 className="text-star-400 text-xs uppercase tracking-widest font-medium mb-3">Admin</h3>
                    <Link
                      href="/admin"
                      className="block px-3 py-2.5 rounded-lg text-rocket-400 hover:bg-white/[0.06] transition-colors text-sm font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  </div>
                )}

                {/* Auth Section */}
                <div className="pt-4 border-t border-white/[0.06] space-y-2">
                  {!isPro && (
                    <Link
                      href="/pricing"
                      className="block text-nebula-400 hover:text-nebula-300 font-medium text-center py-2 text-sm"
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
