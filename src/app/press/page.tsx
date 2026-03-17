'use client';

import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

/* metadata is in layout.tsx */

// revalidate moved to layout

const KEY_STATS = [
  { label: 'Modules', value: '30+', description: 'Integrated intelligence modules' },
  { label: 'Company Profiles', value: '200+', description: 'Space companies tracked' },
  { label: 'News Sources', value: '50+', description: 'Curated RSS feeds and blogs' },
  { label: 'Satellites Tracked', value: '19,000+', description: 'Active orbital objects' },
  { label: 'Data Sources', value: '26+', description: 'APIs and data feeds' },
  { label: 'Launches Monitored', value: 'All', description: 'Global orbital and suborbital' },
  { label: 'Cron Jobs', value: '33', description: 'Automated data pipelines' },
  { label: 'Blog Articles', value: '30+', description: 'In-depth industry analysis' },
  { label: 'App Routes', value: '180+', description: 'Platform pages and features' },
];

const COMPANY_FACTS = [
  { label: 'Founded', value: '2024' },
  { label: 'Headquarters', value: 'Houston, TX' },
  { label: 'Company', value: 'SpaceNexus LLC' },
  { label: 'Industry', value: 'Space Intelligence / SaaS' },
  { label: 'Model', value: 'Freemium (Free / Pro / Enterprise)' },
  { label: 'Platforms', value: 'Web (PWA), Android, iOS' },
  { label: 'Data Refresh', value: 'Real-time (33 automated jobs)' },
  { label: 'AI Engine', value: 'Claude by Anthropic' },
];

const LOGO_ASSETS = [
  { name: 'Full Logo (PNG)', description: 'Primary logo on transparent background', file: 'spacenexus-logo.png' },
  { name: 'App Icon (512x512)', description: 'Square app icon for app stores', file: 'icons/icon-512x512.png' },
  { name: 'Favicon', description: 'Browser tab icon', file: 'favicon-32x32.png' },
];

const PRESS_COVERAGE = [
  {
    title: 'SpaceNexus: Building the Bloomberg Terminal for the Space Economy',
    outlet: 'Company Blog',
    date: 'March 2026',
    url: '/blog',
    type: 'Feature',
  },
  {
    title: 'How SpaceNexus Democratizes Space Industry Intelligence',
    outlet: 'Company Insights',
    date: 'February 2026',
    url: '/blog',
    type: 'Analysis',
  },
  {
    title: 'SpaceNexus Launches B2B Marketplace for Space Services',
    outlet: 'Company Announcement',
    date: 'January 2026',
    url: '/marketplace',
    type: 'Launch',
  },
  {
    title: 'SpaceNexus Reaches 200+ Company Profiles Milestone',
    outlet: 'Company Milestone',
    date: 'December 2025',
    url: '/company-profiles',
    type: 'Milestone',
  },
];

const TYPE_COLORS: Record<string, string> = {
  Feature: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  Analysis: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Launch: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Milestone: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

export default function PressPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Press Kit & Media Resources"
          subtitle="Everything journalists, analysts, and partners need to cover SpaceNexus"
          icon="📰"
          accentColor="cyan"
        />

        <div className="max-w-5xl mx-auto space-y-12">

          {/* Company Overview */}
          <ScrollReveal>
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Company Overview</h2>
            <div className="card p-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">About SpaceNexus</h3>
                <p className="text-slate-400 leading-relaxed">
                  SpaceNexus is the most comprehensive space industry intelligence platform available, designed
                  to serve the rapidly growing $1.8 trillion global space economy. With 30+ integrated modules
                  covering launches, satellite tracking, market intelligence, procurement, 200+ company profiles,
                  regulatory compliance, and a B2B marketplace, SpaceNexus replaces dozens of expensive, fragmented
                  data sources. The platform aggregates real-time data from NASA, NOAA, SAM.gov, and 50+ industry
                  feeds through 33 automated data pipelines, serving space startups, defense contractors, investors,
                  engineers, and government agencies. Available as a progressive web app with native Android and iOS
                  apps, SpaceNexus offers free, Professional ($19.99/mo), and Enterprise ($49.99/mo) tiers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Company Facts</h4>
                  <div className="space-y-2">
                    {COMPANY_FACTS.map((fact) => (
                      <div key={fact.label} className="flex items-start text-sm">
                        <span className="text-slate-500 w-28 shrink-0 font-medium">{fact.label}</span>
                        <span className="text-slate-300">{fact.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Key Differentiators</h4>
                  <ul className="text-slate-400 space-y-1.5 text-sm list-disc list-inside">
                    <li>Only platform combining 30+ modules of space intelligence</li>
                    <li>Freemium model vs. $10K+ enterprise-only competitors</li>
                    <li>Real-time data via 33 automated cron jobs vs. periodic static reports</li>
                    <li>AI-powered insights via Claude by Anthropic</li>
                    <li>Mobile-first PWA with offline support</li>
                    <li>B2B marketplace for space services and procurement</li>
                    <li>30+ original blog articles and industry guides</li>
                    <li>180+ platform pages covering every aspect of the space economy</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          </ScrollReveal>

          {/* Key Statistics */}
          <section>
            <ScrollReveal><h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Platform by the Numbers</h2></ScrollReveal>
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {KEY_STATS.map((stat) => (
                <StaggerItem key={stat.label}><div className="card p-6 text-center">
                  <div className="text-3xl font-bold text-white/70 mb-1">{stat.value}</div>
                  <div className="text-sm font-semibold text-white">{stat.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.description}</div>
                </div></StaggerItem>
              ))}
            </StaggerContainer>
          </section>

          {/* Media Kit Download */}
          <ScrollReveal delay={0.1}>
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Media Kit</h2>
            <div className="card p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Download Brand Assets</h3>
                  <p className="text-slate-400 text-sm max-w-lg">
                    Get everything you need for media coverage in one package: logos, icons, brand colors,
                    product screenshots, and boilerplate descriptions. All assets are provided in high resolution
                    and formatted for both digital and print use.
                  </p>
                  <p className="text-slate-500 text-xs">
                    Includes: PNG logos, app icons, favicon, brand color palette, and usage guidelines.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <a
                    href="/icons/icon-512x512.png"
                    download="spacenexus-media-kit"
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download Media Kit
                  </a>
                  <span className="text-xs text-slate-500">ZIP archive with all brand assets</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Individual Assets</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {LOGO_ASSETS.map((asset) => (
                    <div key={asset.name} className="card p-4">
                      <div className="bg-[#0f172a] rounded-lg p-4 mb-3 flex items-center justify-center h-24">
                        <span className="text-white/70 font-bold text-lg">SN</span>
                      </div>
                      <h4 className="font-semibold text-white text-sm">{asset.name}</h4>
                      <p className="text-slate-400 text-xs mt-1">{asset.description}</p>
                      <a
                        href={`/${asset.file}`}
                        download
                        className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Brand Colors</h4>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-white/[0.1]" />
                    <div>
                      <div className="text-xs font-semibold text-white">Space Navy</div>
                      <div className="text-xs text-slate-400">#0f172a</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#06b6d4] border border-white/[0.1]" />
                    <div>
                      <div className="text-xs font-semibold text-white">Cyan Accent</div>
                      <div className="text-xs text-slate-400">#06b6d4</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#7c3aed] border border-white/[0.1]" />
                    <div>
                      <div className="text-xs font-semibold text-white">Nebula Purple</div>
                      <div className="text-xs text-slate-400">#7c3aed</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#10b981] border border-white/[0.1]" />
                    <div>
                      <div className="text-xs font-semibold text-white">Success Green</div>
                      <div className="text-xs text-slate-400">#10b981</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          </ScrollReveal>

          {/* Recent Press Coverage */}
          <ScrollReveal delay={0.1}>
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Recent Coverage</h2>
            <div className="space-y-3">
              {PRESS_COVERAGE.map((item) => (
                <Link
                  key={item.title}
                  href={item.url}
                  className="card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6 hover:bg-white/[0.06] transition-colors group"
                >
                  <div className="sm:w-28 shrink-0 flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
                    <span className="text-xs text-slate-500">{item.date}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TYPE_COLORS[item.type] || 'bg-white/10 text-slate-400 border-white/20'}`}>
                      {item.type}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{item.outlet}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0 hidden sm:block mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">
              For media coverage inquiries or to submit a story, please contact{' '}
              <a href="mailto:press@spacenexus.us" className="text-cyan-400 hover:underline">press@spacenexus.us</a>
            </p>
          </section>

          </ScrollReveal>

          {/* Boilerplate Descriptions */}
          <ScrollReveal delay={0.1}>
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Boilerplate Descriptions</h2>
            <div className="card p-8 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">50 Words</h3>
                  <button
                    onClick={() => {}}
                    className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed bg-white/[0.04] p-4 rounded-lg border border-white/[0.08]">
                  SpaceNexus is a space industry intelligence platform that consolidates real-time launches,
                  satellite tracking, market analytics, procurement intelligence, and 200+ company profiles into one
                  accessible platform. Serving aerospace professionals, investors, and government agencies, SpaceNexus
                  democratizes access to the data powering the $1.8 trillion space economy.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">100 Words</h3>
                  <button
                    onClick={() => {}}
                    className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed bg-white/[0.04] p-4 rounded-lg border border-white/[0.08]">
                  SpaceNexus is a space industry intelligence platform that consolidates real-time data, market
                  analytics, and business tools into a single, accessible platform. With 30+ integrated modules
                  covering launches, satellite tracking, market intelligence, procurement, company profiles, and
                  regulatory compliance, SpaceNexus replaces dozens of expensive, fragmented data sources. The
                  platform aggregates data from NASA, NOAA, SAM.gov, and 50+ industry feeds through 33 automated
                  data pipelines, serving space startups, defense contractors, investors, engineers, and government
                  agencies. Available as a progressive web app with offline support, SpaceNexus offers free,
                  Professional, and Enterprise tiers. Learn more at spacenexus.us.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">250 Words</h3>
                  <button
                    onClick={() => {}}
                    className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed bg-white/[0.04] p-4 rounded-lg border border-white/[0.08]">
                  SpaceNexus is the most comprehensive space industry intelligence platform available, designed
                  to serve the rapidly growing $1.8 trillion global space economy. The platform integrates 30+
                  modules&mdash;including Mission Control, News &amp; Media, Space Market Intelligence, Business
                  Opportunities, Mission Planning, Space Operations, Space Talent Hub, Regulatory &amp; Compliance,
                  B2B Marketplace, and Solar System Exploration&mdash;into a unified interface that replaces dozens
                  of fragmented, expensive data sources.<br /><br />
                  SpaceNexus aggregates real-time data from NASA, NOAA, SAM.gov, the FCC, and over 50 curated
                  news and analysis sources through 33 automated data pipelines. Users can track every orbital and
                  suborbital launch worldwide, monitor 19,000+ satellites on an interactive 3D globe, access detailed
                  profiles of 200+ space companies with financial data and competitive analysis, browse 30+ original
                  blog articles and industry guides, and discover government procurement opportunities through
                  integrated SAM.gov and SBIR/STTR intelligence.<br /><br />
                  The platform leverages AI powered by Claude (Anthropic) to categorize news, tag company mentions,
                  generate market insights, and power an intelligent procurement copilot. SpaceNexus serves aerospace
                  engineers, defense contractors, investors, startup founders, government program managers, journalists,
                  and space enthusiasts alike.<br /><br />
                  Unlike legacy competitors charging $10,000-50,000+ per year for narrow data sets, SpaceNexus
                  offers a free Explorer tier alongside Professional ($19.99/month) and Enterprise ($49.99/month) plans,
                  democratizing access to space industry intelligence. The platform is available as a responsive
                  web application with 180+ pages, progressive web app capabilities, and native Android and iOS mobile
                  apps. Founded in 2024 and headquartered in Houston, Texas, SpaceNexus LLC is building the Bloomberg
                  Terminal of the space economy.
                </p>
              </div>
            </div>
          </section>

          </ScrollReveal>

          {/* Product Screenshots */}
          <ScrollReveal delay={0.1}>
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Product Screenshots</h2>
            <div className="card p-8">
              <p className="text-slate-400 mb-6 text-sm">
                High-resolution screenshots of the SpaceNexus platform for media use.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="bg-[#0f172a] rounded-lg p-4 mb-3 h-32 flex items-center justify-center">
                    <span className="text-slate-500 text-sm">Mission Control Dashboard</span>
                  </div>
                  <p className="text-xs text-slate-400">Real-time dashboard with launches, market data, and news</p>
                </div>
                <div className="card p-4">
                  <div className="bg-[#0f172a] rounded-lg p-4 mb-3 h-32 flex items-center justify-center">
                    <span className="text-slate-500 text-sm">Satellite Tracker (3D Globe)</span>
                  </div>
                  <p className="text-xs text-slate-400">Interactive 3D globe tracking 19,000+ satellites</p>
                </div>
                <div className="card p-4">
                  <div className="bg-[#0f172a] rounded-lg p-4 mb-3 h-32 flex items-center justify-center">
                    <span className="text-slate-500 text-sm">Company Profiles Directory</span>
                  </div>
                  <p className="text-xs text-slate-400">200+ company profiles with financial data and analysis</p>
                </div>
                <div className="card p-4">
                  <div className="bg-[#0f172a] rounded-lg p-4 mb-3 h-32 flex items-center justify-center">
                    <span className="text-slate-500 text-sm">B2B Marketplace</span>
                  </div>
                  <p className="text-xs text-slate-400">Space services marketplace connecting buyers and providers</p>
                </div>
              </div>
            </div>
          </section>

          </ScrollReveal>

          {/* Media Contact */}
          <ScrollReveal delay={0.1}>
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Media Contact</h2>
            <div className="card p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Press Inquiries</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">Press Email</div>
                        <a href="mailto:press@spacenexus.us" className="text-white hover:text-cyan-400 transition-colors">press@spacenexus.us</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">General Support</div>
                        <a href="mailto:support@spacenexus.us" className="text-white hover:text-purple-400 transition-colors">support@spacenexus.us</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">Website</div>
                        <a href="https://spacenexus.us" className="text-white hover:text-emerald-400 transition-colors">spacenexus.us</a>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                    <p className="text-slate-500 text-xs leading-relaxed">
                      We typically respond to media inquiries within 24 hours. For urgent requests, please include
                      &quot;URGENT&quot; in your subject line. Interviews and product demos available upon request.
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Follow Us</h3>
                  <div className="space-y-3 text-sm">
                    <a href="https://linkedin.com/company/spacenexus" className="flex items-center gap-3 group" target="_blank" rel="noopener noreferrer">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">LinkedIn</div>
                        <span className="text-white group-hover:text-blue-400 transition-colors">SpaceNexus LLC</span>
                      </div>
                    </a>
                    <a href="https://twitter.com/spacenexus" className="flex items-center gap-3 group" target="_blank" rel="noopener noreferrer">
                      <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">X (Twitter)</div>
                        <span className="text-white group-hover:text-slate-300 transition-colors">@spacenexus</span>
                      </div>
                    </a>
                    <a href="https://github.com/jackosaurus2014/spacehub" className="flex items-center gap-3 group" target="_blank" rel="noopener noreferrer">
                      <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">GitHub</div>
                        <span className="text-white group-hover:text-slate-300 transition-colors">jackosaurus2014/spacehub</span>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          </ScrollReveal>

          {/* Approved Quotes */}
          <ScrollReveal delay={0.1}>
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Approved Quotes</h2>
            <div className="card p-8 space-y-6">
              <blockquote className="border-l-4 border-white/15 pl-4">
                <p className="text-slate-400 italic leading-relaxed">
                  &quot;The space industry has been making decisions with fragmented, expensive data for too long.
                  SpaceNexus brings everything together&mdash;launches, markets, companies, procurement, compliance&mdash;into
                  one platform that anyone can access. We&apos;re building the Bloomberg Terminal of the space economy.&quot;
                </p>
                <cite className="text-slate-500 text-sm mt-2 block">&mdash; Founder, SpaceNexus</cite>
              </blockquote>

              <blockquote className="border-l-4 border-white/15 pl-4">
                <p className="text-slate-400 italic leading-relaxed">
                  &quot;Our competitors charge $10,000 to $50,000 per year for narrow datasets. SpaceNexus offers
                  30+ integrated modules starting at free. We believe democratizing space intelligence accelerates
                  the entire industry.&quot;
                </p>
                <cite className="text-slate-500 text-sm mt-2 block">&mdash; Founder, SpaceNexus</cite>
              </blockquote>

              <blockquote className="border-l-4 border-white/15 pl-4">
                <p className="text-slate-400 italic leading-relaxed">
                  &quot;With 33 automated data pipelines refreshing information around the clock, SpaceNexus
                  provides the real-time intelligence that space professionals need to make informed decisions.
                  We&apos;re not just aggregating data&mdash;we&apos;re building the connective tissue of the
                  space economy.&quot;
                </p>
                <cite className="text-slate-500 text-sm mt-2 block">&mdash; Founder, SpaceNexus</cite>
              </blockquote>
            </div>
          </section>

          </ScrollReveal>

          {/* Related Pages */}
          <section className="flex flex-wrap gap-4 justify-center">
            <Link href="/pricing" className="btn-primary text-sm py-2 px-4">
              View Pricing
            </Link>
            <Link href="/faq" className="btn-secondary text-sm py-2 px-4">
              FAQ
            </Link>
            <Link href="/contact" className="btn-secondary text-sm py-2 px-4">
              Contact Us
            </Link>
            <Link href="/about" className="btn-secondary text-sm py-2 px-4">
              About Us
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
