'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ModuleRecommendation {
  label: string;
  href: string;
  description: string;
}

const ROLE_RECOMMENDATIONS: Record<string, { greeting: string; modules: ModuleRecommendation[] }> = {
  'Space Industry Investor': {
    greeting: 'As an investor, here are the modules that will give you the best edge:',
    modules: [
      { label: 'Market Intel', href: '/market-intel', description: 'Real-time space stock and deal flow tracking' },
      { label: 'Space Capital', href: '/space-capital', description: 'VC investors, startups and matchmaking' },
      { label: 'Investment Tracker', href: '/investment-tracker', description: 'Funding trends, top deals and investors' },
      { label: 'Deal Flow', href: '/deal-flow', description: 'Investment deals, M&A and partnerships' },
      { label: 'Portfolio Tracker', href: '/portfolio-tracker', description: 'Track space investment portfolios' },
    ],
  },
  'Aerospace Engineer': {
    greeting: 'As an engineer, these technical modules are built for you:',
    modules: [
      { label: 'Tools & Calculators', href: '/tools', description: 'Mission cost, link budget and orbital calculators' },
      { label: 'Satellite Tracker', href: '/satellites', description: 'Track ISS, Starlink and weather satellites' },
      { label: 'Blueprint Series', href: '/blueprints', description: 'Technical hardware breakdowns and schematics' },
      { label: 'Propulsion Database', href: '/propulsion-database', description: 'Engine and thruster specifications' },
      { label: 'Constellation Designer', href: '/constellation-designer', description: 'Design satellite constellations' },
    ],
  },
  'Policy & Regulatory Analyst': {
    greeting: 'As an analyst, these intelligence modules will accelerate your research:',
    modules: [
      { label: 'Company Profiles', href: '/company-profiles', description: '200+ space company profiles with SpaceNexus Score' },
      { label: 'Intelligence Brief', href: '/intelligence-brief', description: 'Weekly curated industry briefing' },
      { label: 'Market Map', href: '/market-map', description: 'Visual industry landscape by sector' },
      { label: 'Regulatory Hub', href: '/compliance', description: 'Compliance, space law and filings' },
      { label: 'Industry Trends', href: '/industry-trends', description: 'Data-backed space industry trend analysis' },
    ],
  },
  'Space Startup Founder': {
    greeting: 'As a founder, these modules will help you grow and compete:',
    modules: [
      { label: 'Business Opportunities', href: '/business-opportunities', description: 'AI-powered opportunity discovery' },
      { label: 'Investment Tracker', href: '/investment-tracker', description: 'Funding trends and top investors' },
      { label: 'Space Talent Hub', href: '/space-talent', description: 'Jobs, experts and workforce analytics' },
      { label: 'Unit Economics', href: '/unit-economics', description: 'Revenue modeling calculator' },
      { label: 'Contract Awards', href: '/contract-awards', description: 'Government and commercial contract tracker' },
    ],
  },
  'Defense & Intelligence': {
    greeting: 'As a defense professional, these modules cover your critical areas:',
    modules: [
      { label: 'Space Defense', href: '/space-defense', description: 'Military space and national security' },
      { label: 'Regulatory Hub', href: '/compliance', description: 'ITAR export controls and compliance' },
      { label: 'Contract Awards', href: '/contract-awards', description: 'Government contract feed and procurement' },
      { label: 'Space Environment', href: '/space-environment', description: 'Space weather, debris and operations' },
      { label: 'Tech Readiness', href: '/tech-readiness', description: 'Emerging technology TRL tracking' },
    ],
  },
  'Space Enthusiast': {
    greeting: 'Welcome, space enthusiast! Start exploring with these favorites:',
    modules: [
      { label: 'News & Updates', href: '/news', description: 'Latest space industry news from 53+ sources' },
      { label: 'Mission Control', href: '/mission-control', description: 'Upcoming launches and events' },
      { label: 'Satellite Tracker', href: '/satellites', description: 'Track the ISS, Starlink and more in real time' },
      { label: 'Solar Exploration', href: '/solar-exploration', description: '3D planetary visualization' },
      { label: 'Asteroid Watch', href: '/asteroid-watch', description: 'NEOs, planetary defense and mining targets' },
    ],
  },
};

export default function PersonalizedWelcome() {
  const [role, setRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const storedRole = localStorage.getItem('spacenexus-user-role');
      if (storedRole && ROLE_RECOMMENDATIONS[storedRole]) {
        setRole(storedRole);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  if (!mounted || !role) return null;

  const rec = ROLE_RECOMMENDATIONS[role];
  if (!rec) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-blue-500/10 p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                  Recommended for You
                </h2>
                <p className="text-slate-300 text-sm md:text-base">
                  {rec.greeting}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rec.modules.map((mod) => (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="group flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/10 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                      {mod.label}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                      {mod.description}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Based on your selection: <span className="text-slate-400">{role}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
