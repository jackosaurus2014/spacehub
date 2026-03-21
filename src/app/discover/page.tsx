import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Discover SpaceNexus',
  description: 'Explore everything SpaceNexus has to offer. Find the right tools, data, and content for your role in the space industry.',
  alternates: { canonical: 'https://spacenexus.us/discover' },
};

export const revalidate = 86400;

const quickStart = [
  { href: '/mission-control', icon: '🚀', label: 'Track Launches', description: 'Live countdowns and mission status' },
  { href: '/satellites', icon: '🛰️', label: 'Track Satellites', description: '10,000+ objects in real time' },
  { href: '/news', icon: '📰', label: 'Read News', description: 'Aggregated from 12+ sources' },
  { href: '/space-weather', icon: '☀️', label: 'Space Weather', description: 'Solar flares and Kp index' },
  { href: '/market-intel', icon: '📊', label: 'Market Intel', description: 'Stocks, funding, and M&A' },
  { href: '/blog', icon: '📝', label: '180+ Articles', description: 'Guides, analysis, and deep-dives' },
];

const byRole = [
  {
    role: 'Space Enthusiast',
    icon: '🔭',
    description: 'Track launches, spot satellites, learn about space',
    links: [
      { label: 'Launch Schedule', href: '/mission-control' },
      { label: 'Satellite Spotter Guide', href: '/satellite-spotting' },
      { label: 'Aurora Forecast', href: '/aurora-forecast' },
      { label: 'Space Quiz', href: '/space-quiz' },
      { label: 'Space Timeline', href: '/timeline' },
      { label: 'Glossary', href: '/glossary' },
    ],
  },
  {
    role: 'Investor / Analyst',
    icon: '💰',
    description: 'Track funding, analyze markets, research companies',
    links: [
      { label: 'Funding Rounds', href: '/funding-rounds' },
      { label: 'Company Profiles', href: '/company-profiles' },
      { label: 'Space Capital', href: '/space-capital' },
      { label: 'Deal Flow', href: '/deal-flow' },
      { label: 'Market Sizing', href: '/market-sizing' },
      { label: 'Executive Moves', href: '/executive-moves' },
    ],
  },
  {
    role: 'Engineer',
    icon: '🔧',
    description: 'Calculate orbits, design missions, analyze subsystems',
    links: [
      { label: 'Orbital Calculator', href: '/orbital-calculator' },
      { label: 'Link Budget Calc', href: '/link-budget-calculator' },
      { label: 'Thermal Calculator', href: '/thermal-calculator' },
      { label: 'Constellation Designer', href: '/constellation-designer' },
      { label: 'Mission Simulator', href: '/mission-simulator' },
      { label: 'Propulsion Database', href: '/propulsion-database' },
    ],
  },
  {
    role: 'Policy / Compliance',
    icon: '📋',
    description: 'Navigate regulations, track filings, stay compliant',
    links: [
      { label: 'Compliance Hub', href: '/compliance' },
      { label: 'Licensing Checker', href: '/licensing-checker' },
      { label: 'Export Controls', href: '/export-classifications' },
      { label: 'Regulatory Calendar', href: '/regulatory-calendar' },
      { label: 'Legal Resources', href: '/legal-resources' },
      { label: 'Regulation Explainers', href: '/regulation-explainers' },
    ],
  },
  {
    role: 'Business Development',
    icon: '🤝',
    description: 'Find opportunities, track contracts, research partners',
    links: [
      { label: 'Procurement', href: '/procurement' },
      { label: 'Business Opportunities', href: '/business-opportunities' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Contract Awards', href: '/contract-awards' },
      { label: 'Company Research', href: '/company-research' },
      { label: 'Startup Directory', href: '/startup-directory' },
    ],
  },
  {
    role: 'Educator / Student',
    icon: '🎓',
    description: 'Learn about space, find resources, explore careers',
    links: [
      { label: 'Learning Center', href: '/learn' },
      { label: 'Career Guide', href: '/career-guide' },
      { label: 'Education Pathways', href: '/education-pathways' },
      { label: 'Salary Benchmarks', href: '/salary-benchmarks' },
      { label: 'Space Acronyms', href: '/acronyms' },
      { label: 'Orbit Guide', href: '/orbit-guide' },
    ],
  },
];

const hiddenGems = [
  { href: '/daily-digest', label: 'Daily Digest', description: 'Curated morning briefing' },
  { href: '/space-quiz', label: 'Space Quiz', description: 'Test your knowledge daily' },
  { href: '/reading-list', label: 'Reading List', description: 'Save articles for later' },
  { href: '/my-watchlists', label: 'Watchlists', description: 'Track companies and get alerts' },
  { href: '/podcasts', label: 'Space Podcasts', description: '25+ shows in one directory' },
  { href: '/space-stats', label: 'Space Stats', description: '42 stat cards about the industry' },
  { href: '/year-in-review', label: 'Year in Review', description: '2026 platform milestones' },
  { href: '/space-map', label: 'Industry Map', description: '8 sectors, 30+ companies visualized' },
];

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Discover SpaceNexus"
          subtitle="Find the right tools and data for your role"
          icon="🔭"
          accentColor="cyan"
        >
          <Link href="/register" className="btn-primary text-sm py-2 px-4">
            Start Free
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-5xl mx-auto space-y-10">
          {/* Search hint — encourages users to use Ctrl+K */}
          <div className="text-center">
            <p className="text-slate-500 text-sm">
              Looking for something specific? Press{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-slate-300 text-xs font-mono">Ctrl</kbd>
              {' + '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-slate-300 text-xs font-mono">K</kbd>
              {' '}to search 260+ pages instantly.
            </p>
          </div>

          {/* Quick Start Grid */}
          <ScrollReveal>
            <h2 className="text-lg font-semibold text-white mb-4">Jump In</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickStart.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="card p-4 hover:bg-white/[0.04] transition-all group"
                >
                  <span className="text-2xl block mb-2">{item.icon}</span>
                  <p className="text-white text-sm font-medium group-hover:text-cyan-300 transition-colors">{item.label}</p>
                  <p className="text-slate-500 text-xs">{item.description}</p>
                </Link>
              ))}
            </div>
          </ScrollReveal>

          {/* By Role */}
          <ScrollReveal>
            <h2 className="text-lg font-semibold text-white mb-4">By Role</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {byRole.map((persona) => (
                <div key={persona.role} className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{persona.icon}</span>
                    <div>
                      <h3 className="text-white text-sm font-semibold">{persona.role}</h3>
                      <p className="text-slate-500 text-xs">{persona.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {persona.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-xs text-slate-400 hover:text-cyan-300 transition-colors py-1 px-2 rounded hover:bg-white/[0.04]"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Worth Exploring */}
          <ScrollReveal>
            <h2 className="text-lg font-semibold text-white mb-1">Worth Exploring</h2>
            <p className="text-slate-500 text-sm mb-4">Popular features you might not have found yet</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {hiddenGems.map((gem) => (
                <Link
                  key={gem.href}
                  href={gem.href}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all text-center group"
                >
                  <p className="text-white text-sm font-medium group-hover:text-cyan-300 transition-colors">{gem.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{gem.description}</p>
                </Link>
              ))}
            </div>
          </ScrollReveal>

          {/* Quick Actions */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/features"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors"
              >
                Browse All 260+ Features
              </Link>
              <Link
                href="/getting-started"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.12] rounded-lg transition-colors"
              >
                Getting Started Guide
              </Link>
              <Link href="/app" className="text-sm text-slate-400 hover:text-slate-300 underline underline-offset-2">
                Get the Android app
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
