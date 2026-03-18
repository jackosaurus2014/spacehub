'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

/** Pages where the help button should NOT appear */
const EXCLUDED_PATHS = ['/', '/pricing', '/register', '/login', '/forgot-password', '/reset-password', '/verify-email'];

export default function HelpButton() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Hide on excluded (unauthenticated-facing) pages */
  const isExcluded = EXCLUDED_PATHS.includes(pathname);

  /* Close panel when clicking outside */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  /* Close panel on Escape key */
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen]);

  /* Close on route change */
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  /* Don't render if not logged in or on excluded pages */
  if (!session || isExcluded) return null;

  return (
    <div ref={panelRef} className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50">
      {/* Expanded panel */}
      {isOpen && (
        <div
          id="help-panel"
          role="dialog"
          aria-label="Help menu"
          className="absolute bottom-14 right-0 w-72 rounded-xl border border-white/[0.1] bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-sm font-semibold text-white">Need help?</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close help panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick links */}
          <nav className="p-2">
            <Link
              href="/help"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </span>
              <div>
                <span className="font-medium">Help Center</span>
                <p className="text-xs text-slate-500">Browse FAQs and guides</p>
              </div>
            </Link>

            <Link
              href="/getting-started"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              <div>
                <span className="font-medium">Getting Started</span>
                <p className="text-xs text-slate-500">New user walkthrough</p>
              </div>
            </Link>

            <Link
              href="/contact"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <div>
                <span className="font-medium">Contact Support</span>
                <p className="text-xs text-slate-500">support@spacenexus.us</p>
              </div>
            </Link>
          </nav>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
          isOpen
            ? 'bg-white/[0.12] text-white border border-white/[0.15]'
            : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/30 hover:shadow-blue-500/20 hover:shadow-xl'
        }`}
        aria-label={isOpen ? 'Close help' : 'Open help'}
        aria-expanded={isOpen}
        aria-controls="help-panel"
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>
    </div>
  );
}
