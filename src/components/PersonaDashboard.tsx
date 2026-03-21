'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { UserPersona } from '@/components/ui/OnboardingTour';

const PERSONA_KEY = 'spacenexus-user-persona';

// ─── Simplified 3-category picker for first-touch ────────────────────────────

type BroadCategory = 'enthusiast' | 'investor' | 'professional';

const BROAD_CATEGORIES: { id: BroadCategory; icon: string; label: string; description: string; mapsTo: UserPersona }[] = [
  {
    id: 'enthusiast',
    icon: '🔭',
    label: 'Space Enthusiast',
    description: 'Track launches, spot satellites, explore the night sky',
    mapsTo: 'mission-planner', // Maps to mission-planner for tool access
  },
  {
    id: 'investor',
    icon: '💰',
    label: 'Investor / Analyst',
    description: 'Track funding, analyze markets, research companies',
    mapsTo: 'investor',
  },
  {
    id: 'professional',
    icon: '🚀',
    label: 'Space Professional',
    description: 'Engineering tools, compliance, procurement, talent',
    mapsTo: 'executive', // Maps to executive for broad business access
  },
];

// ─── Quick links per broad category ──────────────────────────────────────────

interface QuickLink {
  href: string;
  title: string;
  description: string;
  icon: string;
}

const CATEGORY_LINKS: Record<BroadCategory, { tagline: string; links: QuickLink[] }> = {
  enthusiast: {
    tagline: 'Explore the cosmos with real-time data and interactive tools',
    links: [
      { href: '/mission-control', title: 'Launch Tracker', description: 'Live countdowns and mission status', icon: '🚀' },
      { href: '/satellites', title: 'Satellite Tracker', description: 'Track 10,000+ objects in real time', icon: '🛰️' },
      { href: '/space-weather', title: 'Space Weather', description: 'Solar activity and aurora forecast', icon: '☀️' },
      { href: '/night-sky-guide', title: 'Night Sky Guide', description: 'What to see tonight', icon: '🌙' },
      { href: '/blog', title: '200+ Articles', description: 'Guides, analysis, and deep-dives', icon: '📝' },
      { href: '/space-tycoon', title: 'Space Tycoon', description: 'Build your space empire', icon: '🎮' },
    ],
  },
  investor: {
    tagline: 'Evaluate opportunities and track the space economy',
    links: [
      { href: '/market-intel', title: 'Market Intelligence', description: 'Stocks, ETFs, and market data', icon: '📊' },
      { href: '/funding-tracker', title: 'Funding Tracker', description: 'Live funding rounds and exits', icon: '📈' },
      { href: '/company-profiles', title: 'Company Profiles', description: '200+ space company dossiers', icon: '🏢' },
      { href: '/ai-insights', title: 'AI Market Analysis', description: 'AI-generated industry insights', icon: '🧠' },
      { href: '/space-capital', title: 'Space Capital', description: 'VCs and investor directory', icon: '💸' },
      { href: '/market-sizing', title: 'Market Sizing (TAM)', description: 'Interactive market models', icon: '📋' },
    ],
  },
  professional: {
    tagline: 'Professional tools for engineers, executives, and operators',
    links: [
      { href: '/mission-cost', title: 'Mission Cost Calculator', description: 'Estimate launch and mission costs', icon: '🧮' },
      { href: '/compliance', title: 'Regulatory Hub', description: 'FCC, FAA, ITAR compliance tracker', icon: '⚖️' },
      { href: '/procurement', title: 'Procurement Intel', description: 'Government contracts and RFPs', icon: '📋' },
      { href: '/space-talent', title: 'Talent Hub', description: 'Space workforce and job data', icon: '👥' },
      { href: '/launch-vehicles', title: 'Launch Vehicles', description: 'Compare rockets and providers', icon: '🛸' },
      { href: '/supply-chain', title: 'Supply Chain', description: 'Supplier mapping and logistics', icon: '🔗' },
    ],
  },
};

// Map broad category to the detailed persona for storage
function broadToPersona(broad: BroadCategory): UserPersona {
  return BROAD_CATEGORIES.find(c => c.id === broad)?.mapsTo || 'executive';
}

// Map stored persona back to broad category
function personaToBroad(persona: UserPersona): BroadCategory {
  if (persona === 'investor') return 'investor';
  if (persona === 'mission-planner' || persona === 'entrepreneur') return 'enthusiast';
  return 'professional'; // executive, supply-chain, legal
}

export default function PersonaDashboard() {
  const [broadCategory, setBroadCategory] = useState<BroadCategory | null>(null);
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(PERSONA_KEY) as UserPersona | null;
    if (stored) {
      setBroadCategory(personaToBroad(stored));
    }

    const handleChange = () => {
      const p = localStorage.getItem(PERSONA_KEY) as UserPersona | null;
      setBroadCategory(p ? personaToBroad(p) : null);
    };
    window.addEventListener('persona-changed', handleChange);
    return () => window.removeEventListener('persona-changed', handleChange);
  }, []);

  if (!mounted) return null;

  const handleSelect = (cat: BroadCategory) => {
    const persona = broadToPersona(cat);
    localStorage.setItem(PERSONA_KEY, persona);
    setBroadCategory(cat);
    window.dispatchEvent(new Event('persona-changed'));
  };

  // ─── Role picker for first-time visitors ─────────────────────────
  if (!broadCategory) {
    return (
      <section className="section-spacer-sm relative z-10">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <h2 className="text-display text-2xl md:text-3xl text-white mb-2">
              What brings you to SpaceNexus?
            </h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              We&apos;ll personalize your experience based on your interests
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {BROAD_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat.id)}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-200 text-center"
              >
                <span className="text-4xl">{cat.icon}</span>
                <div>
                  <span className="text-base font-semibold text-white group-hover:text-white transition-colors block">
                    {cat.label}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {cat.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ─── Personalized quick access ────────────────────────────────────
  const config = CATEGORY_LINKS[broadCategory];
  const catDef = BROAD_CATEGORIES.find(c => c.id === broadCategory);

  return (
    <section className="section-spacer-sm relative z-10">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-medium mb-3">
            <span>{catDef?.icon}</span>
            {catDef?.label}
          </div>
          <h2 className="text-display text-2xl md:text-3xl text-white mb-2">
            Recommended for You
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            {config.tagline}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
          {config.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group card-glass flex items-start gap-3 p-4"
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{link.icon}</span>
              <div className="min-w-0">
                <h3 className="font-semibold text-white group-hover:text-white transition-colors text-sm">
                  {link.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {link.description}
                </p>
              </div>
              <svg className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors flex-shrink-0 mt-1 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Register to customize nudge — only for non-authenticated visitors */}
        {!session && (
          <div className="mt-6 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-slate-400 text-xs">
                Want to choose exactly which modules appear?
              </p>
              <Link
                href="/register?utm_source=homepage&utm_medium=persona_nudge"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors"
              >
                Create free account
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Change role */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              localStorage.removeItem(PERSONA_KEY);
              localStorage.removeItem('spacenexus-onboarding-complete');
              setBroadCategory(null);
              window.dispatchEvent(new Event('persona-changed'));
            }}
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            Not {catDef?.label.toLowerCase().startsWith('space') ? 'a' : 'an'} {catDef?.label.toLowerCase()}? Change your role
          </button>
        </div>
      </div>
    </section>
  );
}
