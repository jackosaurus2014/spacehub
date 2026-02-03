'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { useSubscription } from './SubscriptionProvider';

export default function Navigation() {
  const { data: session, status } = useSession();
  const { tier, isPro } = useSubscription();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-space-900/80 backdrop-blur-md border-b border-space-600/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🚀</span>
            <span className="font-display font-bold text-xl gradient-text">
              SpaceNexus
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-star-200 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href="/mission-control"
              className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>🎯</span> Mission Control
            </Link>
            <Link
              href="/blogs"
              className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>✍️</span> Blogs
            </Link>
            <Link
              href="/market-intel"
              className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>📊</span> Market Intel
            </Link>
            <Link
              href="/resource-exchange"
              className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>💰</span> Resources
            </Link>
            <Link
              href="/business-opportunities"
              className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>💼</span> Opportunities
            </Link>
            <Link
              href="/compliance"
              className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>⚖️</span> Compliance
            </Link>
            <Link
              href="/solar-exploration"
              className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>🌍</span> Exploration
            </Link>
            <Link
              href="/solar-flares"
              className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
            >
              <span>☀️</span> Solar
            </Link>
            <Link
              href="/news"
              className="text-star-200 hover:text-white transition-colors"
            >
              News
            </Link>
            {status === 'authenticated' && (
              <Link
                href="/dashboard"
                className="text-star-200 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            )}
            {session?.user?.isAdmin && (
              <Link
                href="/admin"
                className="text-rocket-400 hover:text-rocket-300 transition-colors font-medium"
              >
                Admin
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
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
              <div className="flex items-center space-x-4">
                {isPro && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-nebula-500/20 text-nebula-300 border border-nebula-500/30">
                    PRO
                  </span>
                )}
                <span className="text-star-300 text-sm">
                  {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="btn-secondary text-sm py-1.5 px-4"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm py-1.5 px-4">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary text-sm py-1.5 px-4">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-star-200 hover:text-white"
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
          <div className="md:hidden py-4 border-t border-space-600/50">
            <div className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-star-200 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/mission-control"
                className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>🎯</span> Mission Control
              </Link>
              <Link
                href="/blogs"
                className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>✍️</span> Blogs
              </Link>
              <Link
                href="/market-intel"
                className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>📊</span> Market Intel
              </Link>
              <Link
                href="/resource-exchange"
                className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>💰</span> Resources
              </Link>
              <Link
                href="/business-opportunities"
                className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>💼</span> Opportunities
              </Link>
              <Link
                href="/compliance"
                className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>⚖️</span> Compliance
              </Link>
              <Link
                href="/solar-exploration"
                className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>🌍</span> Exploration
              </Link>
              <Link
                href="/solar-flares"
                className="text-star-200 hover:text-white transition-colors flex items-center gap-1"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>☀️</span> Solar Flares
              </Link>
              <Link
                href="/news"
                className="text-star-200 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                News
              </Link>
              {status === 'authenticated' && (
                <Link
                  href="/dashboard"
                  className="text-star-200 hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              {session?.user?.isAdmin && (
                <Link
                  href="/admin"
                  className="text-rocket-400 hover:text-rocket-300 transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              <div className="pt-4 border-t border-space-600/50 flex flex-col space-y-2">
                {!isPro && (
                  <Link
                    href="/pricing"
                    className="text-nebula-400 hover:text-nebula-300 font-medium text-center py-2"
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
                    className="btn-secondary text-sm py-1.5 px-4 w-full"
                  >
                    Sign Out
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="btn-secondary text-sm py-1.5 px-4 text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      className="btn-primary text-sm py-1.5 px-4 text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
