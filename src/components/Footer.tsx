'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LegalDisclaimerModal from '@/components/LegalDisclaimerModal';
import NewsletterSignup from '@/components/NewsletterSignup';

const footerLinks = {
  platform: {
    title: 'Platform',
    links: [
      { label: 'Mission Control', href: '/mission-control' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'News & Media', href: '/news' },
      { label: 'Forums', href: '/community/forums' },
      { label: 'Satellite Tracker', href: '/satellites' },
      { label: 'Space Talent Hub', href: '/space-talent' },
      { label: 'Launch Manifest', href: '/launch-manifest' },
    ],
  },
  intelligence: {
    title: 'Intelligence',
    links: [
      { label: 'Company Profiles', href: '/company-profiles' },
      { label: 'Market Intelligence', href: '/market-intel' },
      { label: 'Funding Rounds', href: '/funding-rounds' },
      { label: 'M&A Tracker', href: '/deals' },
      { label: 'Executive Moves', href: '/executive-moves' },
      { label: 'Industry Trends', href: '/industry-trends' },
      { label: 'Space Economy', href: '/space-economy' },
      { label: 'Procurement', href: '/procurement' },
    ],
  },
  tools: {
    title: 'Tools',
    links: [
      { label: 'Mission Simulator', href: '/mission-simulator' },
      { label: 'Orbital Calculator', href: '/orbital-calculator' },
      { label: 'Thermal Calculator', href: '/thermal-calculator' },
      { label: 'Constellation Designer', href: '/constellation-designer' },
      { label: 'Launch Cost Calculator', href: '/mission-cost' },
      { label: 'Radiation Calculator', href: '/radiation-calculator' },
      { label: 'Link Budget Calculator', href: '/link-budget-calculator' },
      { label: 'Power Budget Calculator', href: '/power-budget-calculator' },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Glossary', href: '/glossary' },
      { label: 'Space Timeline', href: '/timeline' },
      { label: 'Education Pathways', href: '/education-pathways' },
      { label: 'Conferences', href: '/conferences' },
      { label: 'Podcasts', href: '/podcasts' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Blog', href: '/blog' },
      { label: 'Learning Center', href: '/learn' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Developer API', href: '/developer' },
      { label: 'Advertise', href: '/advertise' },
    ],
  },
};

export default function Footer() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <>
      <footer className="bg-slate-900 border-t border-slate-800 mt-auto relative">
        {/* Gradient separator */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

        <div className="container mx-auto px-4">
          {/* Quick CTA */}
          <div className="py-8 border-b border-slate-800/60">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-slate-300 text-sm sm:text-base font-medium text-center sm:text-left">
                Ready to explore space industry intelligence?
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shrink-0"
              >
                Get Started Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Main footer grid */}
          <div className="py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-6">
            {/* Brand column */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Image
                src="/spacenexus-logo.png"
                alt="SpaceNexus logo"
                width={140}
                height={70}
                className="h-8 w-auto mb-3 opacity-80"
              />
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Your gateway to the space industry. Real-time data, market intelligence, and expert insights.
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3 mb-4">
                <a
                  href="https://www.linkedin.com/company/112094370"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-cyan-400 transition-colors"
                  aria-label="SpaceNexus on LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href="https://twitter.com/spacenexus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-cyan-400 transition-colors"
                  aria-label="SpaceNexus on X (Twitter)"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
              {/* Newsletter inline */}
              <Suspense fallback={
                <div>
                  <p className="text-slate-500 text-xs mb-2">Loading newsletter...</p>
                </div>
              }>
                <NewsletterSignup variant="footer" source="footer" />
              </Suspense>
            </div>

            {/* Link columns */}
            {Object.values(footerLinks).map((section) => (
              <div key={section.title}>
                <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">
                  {section.title}
                </h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-slate-400 hover:text-cyan-400 text-sm transition-colors inline-block"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-800/60 py-5 flex flex-col md:flex-row items-center justify-between gap-4 pb-24 lg:pb-5">
            {/* Copyright */}
            <p className="text-slate-500 text-xs">
              &copy; {new Date().getFullYear()} SpaceNexus LLC. All rights reserved.
            </p>

            {/* Legal links */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link href="/privacy" className="text-slate-500 hover:text-cyan-400 text-xs transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-slate-500 hover:text-cyan-400 text-xs transition-colors">
                Terms
              </Link>
              <Link href="/legal/dmca" className="text-slate-500 hover:text-cyan-400 text-xs transition-colors">
                DMCA
              </Link>
              <Link href="/cookies" className="text-slate-500 hover:text-cyan-400 text-xs transition-colors">
                Cookie Policy
              </Link>
              <button
                onClick={() => setDisclaimerOpen(true)}
                className="text-slate-500 hover:text-cyan-400 text-xs transition-colors"
              >
                Legal Disclaimer
              </button>
              <button
                onClick={() => {
                  const opener = (window as unknown as Record<string, unknown>).__openKeyboardShortcuts;
                  if (typeof opener === 'function') {
                    (opener as () => void)();
                  }
                }}
                className="text-slate-500 hover:text-cyan-400 text-xs transition-colors flex items-center gap-1"
                aria-label="Open keyboard shortcuts help"
              >
                Shortcuts
                <kbd className="inline-flex items-center justify-center min-w-[18px] h-4 bg-slate-800 border border-slate-700 rounded px-1 font-mono text-[10px] text-slate-400">
                  ?
                </kbd>
              </button>
            </div>

            {/* Built with badge */}
            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
              <span>Built with</span>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 19.5h20L12 2zm0 4l7 13H5l7-13z" />
              </svg>
              <span>Next.js &amp; TypeScript</span>
            </div>
          </div>
        </div>
      </footer>

      <LegalDisclaimerModal
        isOpen={disclaimerOpen}
        onClose={() => setDisclaimerOpen(false)}
      />
    </>
  );
}
