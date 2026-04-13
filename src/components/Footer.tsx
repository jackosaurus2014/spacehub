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
      { label: 'News & Media', href: '/news' },
      { label: 'Satellite Tracker', href: '/satellites' },
      { label: 'Company Profiles', href: '/company-profiles' },
      { label: 'Market Intelligence', href: '/market-intel' },
      { label: 'Space Environment', href: '/space-environment' },
      { label: 'Live Launches', href: '/live' },
      { label: 'Ignition Tracker', href: '/ignition' },
      { label: 'All Features', href: '/features' },
    ],
  },
  tools: {
    title: 'Tools & Intelligence',
    links: [
      { label: 'Mission Cost Calculator', href: '/mission-cost' },
      { label: 'Orbital Calculator', href: '/orbital-calculator' },
      { label: 'Constellation Designer', href: '/constellation-designer' },
      { label: 'Funding Tracker', href: '/funding-rounds' },
      { label: 'Startup Directory', href: '/startup-directory' },
      { label: 'Compliance Hub', href: '/compliance' },
      { label: 'Space Talent Hub', href: '/space-talent' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Solar System Expansion', href: '/solar-exploration' },
      { label: 'Browse All Tools', href: '/tools' },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Blog & Articles', href: '/blog' },
      { label: 'Compare Companies', href: '/compare' },
      { label: 'Business Opportunities', href: '/business-opportunities' },
      { label: 'Daily Digest', href: '/daily-digest' },
      { label: 'Space Stats', href: '/space-stats' },
      { label: 'Glossary', href: '/glossary' },
      { label: 'Podcasts', href: '/podcasts' },
      { label: 'Space Calendar', href: '/space-calendar' },
      { label: 'Newsletter', href: '/newsletter' },
      { label: 'Discover', href: '/discover' },
    ],
  },
  solutions: {
    title: 'Solutions',
    links: [
      { label: 'For Investors', href: '/solutions/investors' },
      { label: 'For Engineers', href: '/solutions/engineers' },
      { label: 'For Executives', href: '/solutions/executives' },
      { label: 'For Analysts', href: '/solutions/analysts' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Book a Demo', href: '/book-demo' },
      { label: 'Use Cases', href: '/use-cases' },
      { label: 'Alternatives', href: '/alternatives' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Roadmap', href: '/roadmap' },
      { label: 'Data Sources', href: '/data-sources' },
      { label: 'Get the App', href: '/app' },
      { label: 'Help Center', href: '/help' },
      { label: 'Send Feedback', href: '/feedback' },
      { label: 'Platform Status', href: '/status' },
      { label: 'Accessibility', href: '/accessibility' },
      { label: 'Getting Started', href: '/getting-started' },
    ],
  },
};

export default function Footer() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <>
      <footer className="bg-black border-t border-white/[0.06] mt-auto relative">
        {/* Subtle gradient glow at top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        <div className="container mx-auto px-4">
          {/* Quick CTA */}
          <div className="py-8 border-b border-white/[0.06]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-slate-400 text-sm sm:text-base font-medium text-center sm:text-left">
                Ready to explore space industry intelligence?
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-all duration-200 ease-smooth shrink-0 hover:shadow-lg hover:shadow-white/[0.05]"
              >
                Get Started Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Mobile Quick Help — visible only on small screens */}
          <div className="sm:hidden border-b border-white/[0.06] py-6">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Quick Links</h4>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/getting-started" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm py-2 min-h-[44px] transition-colors">
                <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Getting Started
              </Link>
              <Link href="/faq" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm py-2 min-h-[44px] transition-colors">
                <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                FAQ
              </Link>
              <Link href="/contact" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm py-2 min-h-[44px] transition-colors">
                <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Us
              </Link>
              <Link href="/book-demo" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm py-2 min-h-[44px] transition-colors">
                <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Book Demo
              </Link>
            </div>
          </div>

          {/* Main footer grid */}
          <div className="py-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-6">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
              <Image
                src="/spacenexus-logo.png"
                alt="SpaceNexus logo"
                width={140}
                height={70}
                className="h-8 w-auto mb-3 opacity-80"
              />
              <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-1">
                Space Industry Intelligence Platform
              </p>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                Real-time data, market intelligence, and expert insights for space professionals.
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3 mb-4">
                <a
                  href="https://www.linkedin.com/company/112094370"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors"
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
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="SpaceNexus on X (Twitter)"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://github.com/jackosaurus2014/spacehub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="SpaceNexus on GitHub"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
              </div>
              {/* Newsletter inline */}
              <Suspense fallback={
                <div>
                  <p className="text-slate-400 text-xs mb-2">Loading newsletter...</p>
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
                <ul className="space-y-0.5">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-slate-400 hover:text-white text-sm transition-colors inline-block py-1.5 sm:py-0.5 min-h-[44px] sm:min-h-0 flex items-center"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar — V3 with version and status */}
          <div className="border-t py-5 flex flex-col md:flex-row items-center justify-between gap-4 pb-24 lg:pb-5" style={{ borderColor: 'var(--border-subtle)' }}>
            {/* Copyright + version + status */}
            <div className="flex items-center gap-3">
              <p className="text-zinc-500 text-xs">
                &copy; {new Date().getFullYear()} SpaceNexus LLC
              </p>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-600 text-[10px] font-mono">v3.0</span>
              <span className="text-zinc-700">·</span>
              <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>

            {/* Legal links */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link href="/privacy" className="text-slate-400 hover:text-white text-xs transition-colors min-h-[44px] sm:min-h-0 inline-flex items-center">
                Privacy
              </Link>
              <Link href="/terms" className="text-slate-400 hover:text-white text-xs transition-colors min-h-[44px] sm:min-h-0 inline-flex items-center">
                Terms
              </Link>
              <Link href="/legal/dmca" className="text-slate-400 hover:text-white text-xs transition-colors min-h-[44px] sm:min-h-0 inline-flex items-center">
                DMCA
              </Link>
              <Link href="/cookies" className="text-slate-400 hover:text-white text-xs transition-colors min-h-[44px] sm:min-h-0 inline-flex items-center">
                Cookie Policy
              </Link>
              <button
                onClick={() => setDisclaimerOpen(true)}
                className="text-slate-400 hover:text-white text-xs transition-colors min-h-[44px] sm:min-h-0 inline-flex items-center"
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
                className="text-slate-400 hover:text-white text-xs transition-colors flex items-center gap-1 min-h-[44px] sm:min-h-0"
                aria-label="Open keyboard shortcuts help"
              >
                Press
                <kbd className="inline-flex items-center justify-center min-w-[18px] h-4 bg-white/[0.08] border border-white/[0.08] rounded px-1 font-mono text-[10px] text-slate-400">
                  ?
                </kbd>
                for keyboard shortcuts
              </button>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-slate-400 hover:text-white text-xs transition-colors flex items-center gap-1 min-h-[44px] sm:min-h-0"
                aria-label="Back to top"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Back to top
              </button>
            </div>

            {/* Built with badge */}
            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
              <span>Built with</span>
              <svg className="w-3.5 h-3.5 text-red-500/70" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              <span>for the space industry</span>
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
