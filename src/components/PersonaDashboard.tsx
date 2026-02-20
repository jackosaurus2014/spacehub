'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { UserPersona } from '@/components/ui/OnboardingTour';

const PERSONA_KEY = 'spacenexus-user-persona';

interface QuickLink {
  href: string;
  title: string;
  description: string;
  icon: string;
}

const PERSONA_CONFIG: Record<UserPersona, { label: string; tagline: string; links: QuickLink[] }> = {
  investor: {
    label: 'Investor',
    tagline: 'Evaluate opportunities and track the space economy',
    links: [
      { href: '/ai-insights', title: 'AI Market Analysis', description: 'AI-generated space industry insights', icon: '\u{1F9E0}' },
      { href: '/investors', title: 'Investor Directory', description: 'Browse active space investors and VCs', icon: '\u{1F4B8}' },
      { href: '/funding-tracker', title: 'Funding Tracker', description: 'Track live funding rounds and exits', icon: '\u{1F4C8}' },
      { href: '/market-sizing', title: 'Market Sizing (TAM)', description: 'Size space markets with data-driven models', icon: '\u{1F4CA}' },
      { href: '/investment-thesis', title: 'AI Thesis Generator', description: 'Generate investment theses with AI', icon: '\u{1F4DD}' },
      { href: '/deal-rooms', title: 'Deal Rooms', description: 'Secure document sharing for due diligence', icon: '\u{1F512}' },
    ],
  },
  entrepreneur: {
    label: 'Entrepreneur',
    tagline: 'Find funding, build your business, discover customers',
    links: [
      { href: '/grant-aggregator', title: 'Grant Aggregator', description: 'SBIR, NASA, and government grants', icon: '\u{1F4B0}' },
      { href: '/funding-tracker', title: 'Funding Tracker', description: 'Track active funding opportunities', icon: '\u{1F4C8}' },
      { href: '/customer-discovery', title: 'Customer Discovery', description: 'Map potential customers and markets', icon: '\u{1F50D}' },
      { href: '/unit-economics', title: 'Unit Economics', description: 'Model your space business economics', icon: '\u{1F4B1}' },
      { href: '/regulatory-risk', title: 'Regulatory Risk', description: 'Assess compliance requirements', icon: '\u26A0\uFE0F' },
      { href: '/marketplace', title: 'Marketplace', description: 'Find partners, suppliers, and buyers', icon: '\u{1F6D2}' },
    ],
  },
  'mission-planner': {
    label: 'Mission Planner',
    tagline: 'Plan missions with real data and professional tools',
    links: [
      { href: '/mission-cost', title: 'Mission Cost Calculator', description: 'Estimate launch and mission costs', icon: '\u{1F680}' },
      { href: '/launch-vehicles', title: 'Launch Vehicles', description: 'Compare rockets and launch providers', icon: '\u{1F6F0}\uFE0F' },
      { href: '/satellites', title: 'Satellite Tracker', description: 'Track satellites in real time', icon: '\u{1F4E1}' },
      { href: '/orbital-slots', title: 'Orbital Slots', description: 'Browse available orbital positions', icon: '\u{1F30D}' },
      { href: '/resource-exchange', title: 'Resource Exchange', description: 'Space materials and component pricing', icon: '\u{1F4E6}' },
      { href: '/blueprints', title: 'Blueprints', description: 'Technical specifications and designs', icon: '\u{1F4D0}' },
    ],
  },
  executive: {
    label: 'Executive',
    tagline: 'Stay informed with market intelligence and industry trends',
    links: [
      { href: '/mission-control', title: 'Mission Control', description: 'Your real-time industry dashboard', icon: '\u{1F3AF}' },
      { href: '/market-intel', title: 'Market Intelligence', description: 'Space economy data and trends', icon: '\u{1F4CA}' },
      { href: '/company-profiles', title: 'Company Directory', description: '100+ space company profiles', icon: '\u{1F3E2}' },
      { href: '/news', title: 'Industry News', description: 'Curated space industry news feed', icon: '\u{1F4F0}' },
      { href: '/space-talent', title: 'Talent Hub', description: 'Space workforce and job market data', icon: '\u{1F465}' },
      { href: '/startup-tracker', title: 'Startup Tracker', description: 'Track emerging space startups', icon: '\u{1F31F}' },
    ],
  },
  'supply-chain': {
    label: 'Supply Chain',
    tagline: 'Map suppliers, track resources, find procurement opportunities',
    links: [
      { href: '/supply-chain', title: 'Supply Chain Map', description: 'Interactive space supply chain visualization', icon: '\u{1F517}' },
      { href: '/resource-exchange', title: 'Resource Exchange', description: 'Materials and component marketplace', icon: '\u{1F4E6}' },
      { href: '/marketplace', title: 'Marketplace', description: 'Find suppliers and service providers', icon: '\u{1F6D2}' },
      { href: '/space-manufacturing', title: 'Manufacturing', description: 'Space manufacturing capabilities', icon: '\u{1F3ED}' },
      { href: '/company-profiles', title: 'Company Directory', description: 'Browse supplier profiles', icon: '\u{1F3E2}' },
      { href: '/procurement', title: 'Procurement Intel', description: 'Government contracts and RFPs', icon: '\u{1F4CB}' },
    ],
  },
  legal: {
    label: 'Legal & Compliance',
    tagline: 'Navigate space regulation, treaties, and export controls',
    links: [
      { href: '/compliance', title: 'Regulatory Hub', description: 'Space law and compliance tracker', icon: '\u2696\uFE0F' },
      { href: '/compliance?tab=treaties', title: 'Space Treaties', description: 'International space law treaties', icon: '\u{1F30D}' },
      { href: '/compliance?tab=filings', title: 'Regulatory Filings', description: 'FCC, FAA, ITU filing tracker', icon: '\u{1F4C4}' },
      { href: '/spectrum', title: 'Spectrum Management', description: 'RF spectrum allocations and auctions', icon: '\u{1F4F6}' },
      { href: '/patent-tracker', title: 'Patent Tracker', description: 'Space technology patent database', icon: '\u{1F4DC}' },
      { href: '/regulatory-risk', title: 'Risk Scoring', description: 'Regulatory risk assessment tool', icon: '\u26A0\uFE0F' },
    ],
  },
};

const PERSONA_LABELS: Record<UserPersona, string> = {
  investor: 'Investor / VC',
  entrepreneur: 'Entrepreneur / Founder',
  'mission-planner': 'Mission Planner / Engineer',
  executive: 'CEO / Executive',
  'supply-chain': 'Supply Chain Professional',
  legal: 'Legal / Compliance',
};

export default function PersonaDashboard() {
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(PERSONA_KEY) as UserPersona | null;
    setPersona(stored);

    const handleChange = () => {
      setPersona(localStorage.getItem(PERSONA_KEY) as UserPersona | null);
    };
    window.addEventListener('persona-changed', handleChange);
    return () => window.removeEventListener('persona-changed', handleChange);
  }, []);

  if (!mounted || !persona) return null;

  const config = PERSONA_CONFIG[persona];
  if (!config) return null;

  return (
    <section className="section-spacer-sm relative z-10">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-3">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {PERSONA_LABELS[persona]}
          </div>
          <h2 className="text-display-sm font-display font-bold text-white mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Your Quick Access Tools
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            {config.tagline}
          </p>
          <div className="gradient-line max-w-xs mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {config.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start gap-4 p-5 rounded-xl border border-slate-700/50 bg-slate-800/30 hover:border-cyan-500/40 hover:bg-slate-800/60 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5"
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{link.icon}</span>
              <div className="min-w-0">
                <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors text-sm">
                  {link.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                  {link.description}
                </p>
              </div>
              <svg className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0 mt-1 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Change persona link */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              localStorage.removeItem(PERSONA_KEY);
              localStorage.removeItem('spacenexus-onboarding-complete');
              setPersona(null);
              window.dispatchEvent(new Event('persona-changed'));
            }}
            className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
          >
            Not a {config.label.toLowerCase()}? Change your role
          </button>
        </div>
      </div>
    </section>
  );
}
