'use client';

import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import { getRelatedModules } from '@/lib/module-relationships';

const BRAND_COLORS = [
  { name: 'Indigo Primary', hex: '#6366f1', className: 'bg-[#6366f1]' },
  { name: 'Space Dark', hex: '#0f172a', className: 'bg-[#0f172a]' },
  { name: 'Cyan Accent', hex: '#06b6d4', className: 'bg-[#06b6d4]' },
  { name: 'Nebula Purple', hex: '#7c3aed', className: 'bg-[#7c3aed]' },
  { name: 'Success Green', hex: '#10b981', className: 'bg-[#10b981]' },
  { name: 'Slate Text', hex: '#94a3b8', className: 'bg-[#94a3b8]' },
];

const KEY_STATS = [
  { label: 'Articles Published', value: '55+', description: 'In-depth industry analysis and guides' },
  { label: 'Company Profiles', value: '200+', description: 'Space companies tracked and profiled' },
  { label: 'Platform Modules', value: '30+', description: 'Integrated intelligence modules' },
  { label: 'Space Acronyms', value: '126', description: 'Defined in our acronym database' },
  { label: 'App Routes', value: '180+', description: 'Platform pages and features' },
  { label: 'Data Pipelines', value: '33', description: 'Automated cron jobs refreshing data' },
];

const COMPANY_INFO = {
  founded: '2026',
  headquarters: 'Houston, TX',
  company: 'SpaceNexus LLC',
  industry: 'Space Industry Intelligence Platform',
  model: 'Freemium (Free / Pro / Enterprise)',
  platforms: 'Web (PWA), Android, iOS',
  ai: 'Claude by Anthropic',
  website: 'spacenexus.us',
};

const SCREENSHOTS = [
  { title: 'Mission Control Dashboard', description: 'Real-time dashboard with launches, market data, breaking news, and AI insights' },
  { title: 'Satellite Tracker (3D Globe)', description: 'Interactive 3D globe tracking 19,000+ active satellites in real-time' },
  { title: 'Company Intelligence Directory', description: '200+ company profiles with funding data, executive moves, and competitive analysis' },
  { title: 'Market Intelligence Module', description: 'Space economy data, industry trends, TAM analysis, and market segments' },
  { title: 'B2B Marketplace', description: 'Space services marketplace connecting buyers and providers' },
  { title: 'Engineering Tools Suite', description: 'Orbital, thermal, link budget, and power calculators for mission planning' },
];

const BOILERPLATES = {
  short: `SpaceNexus is a space industry intelligence platform that consolidates real-time launches, satellite tracking, market analytics, procurement, and 200+ company profiles into one accessible platform, democratizing access to the data powering the $1.8 trillion space economy.`,
  medium: `SpaceNexus is a space industry intelligence platform consolidating real-time data, market analytics, and business tools into a single accessible platform. With 30+ integrated modules covering launches, satellite tracking, market intelligence, procurement, company profiles, and regulatory compliance, SpaceNexus replaces dozens of expensive, fragmented data sources. The platform aggregates data from NASA, NOAA, SAM.gov, and 50+ industry feeds through 33 automated pipelines, serving space startups, defense contractors, investors, engineers, and government agencies. Available as a progressive web app with offline support, SpaceNexus offers free, Professional ($19.99/month), and Enterprise ($49.99/month) tiers.`,
  long: `SpaceNexus is the most comprehensive space industry intelligence platform available, designed to serve the rapidly growing $1.8 trillion global space economy. The platform integrates 30+ modules -- including Mission Control, News & Media, Space Market Intelligence, Business Opportunities, Mission Planning, Space Operations, Space Talent Hub, Regulatory & Compliance, B2B Marketplace, and Solar System Exploration -- into a unified interface that replaces dozens of fragmented, expensive data sources.

SpaceNexus aggregates real-time data from NASA, NOAA, SAM.gov, the FCC, and over 50 curated news and analysis sources through 33 automated data pipelines. Users can track every orbital and suborbital launch worldwide, monitor 19,000+ satellites on an interactive 3D globe, access detailed profiles of 200+ space companies with financial data and competitive analysis, browse 55+ original articles and industry guides, and discover government procurement opportunities through integrated SAM.gov and SBIR/STTR intelligence.

The platform leverages AI powered by Claude (Anthropic) to categorize news, tag company mentions, generate market insights, and power an intelligent procurement copilot. SpaceNexus serves aerospace engineers, defense contractors, investors, startup founders, government program managers, journalists, and space enthusiasts alike.

Unlike legacy competitors charging $10,000-50,000+ per year for narrow data sets, SpaceNexus offers a free Explorer tier alongside Professional ($19.99/month) and Enterprise ($49.99/month) plans, democratizing access to space industry intelligence. The platform is available as a responsive web application with 180+ pages, progressive web app capabilities, and native Android and iOS mobile apps. Founded in 2026 and headquartered in Houston, Texas, SpaceNexus LLC is building the Bloomberg Terminal of the space economy.`,
};

export default function MediaKitPage() {
  const relatedModules = getRelatedModules('media-kit');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="SpaceNexus Media Kit"
          subtitle="Brand assets, company information, and boilerplate descriptions for press and media"
          icon="📦"
          accentColor="indigo"
        />

        <div className="max-w-5xl mx-auto space-y-12">

          {/* Quick Links Bar */}
          <ScrollReveal>
            <div className="card p-4 flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mr-2">Jump to:</span>
              {['Brand Assets', 'Screenshots', 'Company Info', 'Key Stats', 'Boilerplate', 'Contact'].map((section) => (
                <a
                  key={section}
                  href={`#${section.toLowerCase().replace(/\s/g, '-')}`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/15"
                >
                  {section}
                </a>
              ))}
            </div>
          </ScrollReveal>

          {/* Brand Assets */}
          <ScrollReveal>
            <section id="brand-assets">
              <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Brand Assets</h2>
              <div className="card p-8 space-y-8">

                {/* Logo */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Logo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card p-6">
                      <div className="bg-[#0f172a] rounded-lg p-6 mb-3 flex items-center justify-center h-28 border border-white/[0.06]">
                        <span className="text-white/80 font-bold text-2xl tracking-wide">SpaceNexus</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white text-sm">Primary Logo (PNG)</h4>
                          <p className="text-slate-400 text-xs mt-0.5">Transparent background, high resolution</p>
                        </div>
                        <a
                          href="/spacenexus-logo.png"
                          download
                          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Download
                        </a>
                      </div>
                    </div>
                    <div className="card p-6">
                      <div className="bg-[#0f172a] rounded-lg p-6 mb-3 flex items-center justify-center h-28 border border-white/[0.06]">
                        <span className="text-white/80 font-bold text-3xl">SN</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white text-sm">App Icon (512x512)</h4>
                          <p className="text-slate-400 text-xs mt-0.5">Square icon for app stores</p>
                        </div>
                        <a
                          href="/icons/icon-512x512.png"
                          download
                          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Brand Colors */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Brand Colors</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {BRAND_COLORS.map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => copyToClipboard(color.hex)}
                        className="group text-left"
                        title={`Click to copy ${color.hex}`}
                      >
                        <div className={`w-full h-14 rounded-lg ${color.className} border border-white/[0.1] group-hover:ring-2 group-hover:ring-indigo-400/50 transition-all`} />
                        <div className="mt-1.5">
                          <div className="text-xs font-semibold text-white">{color.name}</div>
                          <div className="text-xs text-slate-400 group-hover:text-indigo-400 transition-colors">{color.hex}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Click any color to copy the hex code to clipboard.</p>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Product Screenshots */}
          <ScrollReveal delay={0.1}>
            <section id="screenshots">
              <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Product Screenshots</h2>
              <div className="card p-8">
                <p className="text-slate-400 mb-6 text-sm">
                  High-resolution screenshots of the SpaceNexus platform available for media use. Contact{' '}
                  <a href="mailto:press@spacenexus.us" className="text-indigo-400 hover:underline">press@spacenexus.us</a>{' '}
                  for custom screenshots or specific module views.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SCREENSHOTS.map((screenshot) => (
                    <div key={screenshot.title} className="card p-4">
                      <div className="bg-[#0f172a] rounded-lg p-4 mb-3 h-28 flex items-center justify-center border border-white/[0.06]">
                        <span className="text-slate-500 text-xs text-center">{screenshot.title}</span>
                      </div>
                      <h4 className="font-semibold text-white text-sm">{screenshot.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{screenshot.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Company Info */}
          <ScrollReveal delay={0.1}>
            <section id="company-info">
              <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Company Information</h2>
              <div className="card p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Company Facts</h3>
                    <div className="space-y-3">
                      {Object.entries(COMPANY_INFO).map(([key, value]) => (
                        <div key={key} className="flex items-start text-sm">
                          <span className="text-slate-500 w-32 shrink-0 font-medium capitalize">{key === 'ai' ? 'AI Engine' : key}</span>
                          <span className="text-slate-300">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Key Differentiators</h3>
                    <ul className="text-slate-400 space-y-1.5 text-sm list-disc list-inside">
                      <li>Only platform combining 30+ modules of space intelligence</li>
                      <li>Freemium model vs. $10K+ enterprise-only competitors</li>
                      <li>Real-time data via 33 automated cron jobs</li>
                      <li>AI-powered insights via Claude by Anthropic</li>
                      <li>Mobile-first PWA with offline support</li>
                      <li>B2B marketplace for space services and procurement</li>
                      <li>55+ original articles and industry guides</li>
                      <li>126 curated space industry acronyms</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Key Stats */}
          <section id="key-stats">
            <ScrollReveal>
              <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Key Statistics</h2>
            </ScrollReveal>
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {KEY_STATS.map((stat) => (
                <StaggerItem key={stat.label}>
                  <div className="card p-6 text-center">
                    <div className="text-3xl font-bold text-indigo-400 mb-1">{stat.value}</div>
                    <div className="text-sm font-semibold text-white">{stat.label}</div>
                    <div className="text-xs text-slate-400 mt-1">{stat.description}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>

          {/* Boilerplate Descriptions */}
          <ScrollReveal delay={0.1}>
            <section id="boilerplate">
              <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Boilerplate Descriptions</h2>
              <div className="card p-8 space-y-6">

                {/* Short */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Short (~50 Words)</h3>
                    <button
                      onClick={() => copyToClipboard(BOILERPLATES.short)}
                      className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed bg-white/[0.04] p-4 rounded-lg border border-white/[0.08]">
                    {BOILERPLATES.short}
                  </p>
                </div>

                {/* Medium */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Medium (~100 Words)</h3>
                    <button
                      onClick={() => copyToClipboard(BOILERPLATES.medium)}
                      className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed bg-white/[0.04] p-4 rounded-lg border border-white/[0.08]">
                    {BOILERPLATES.medium}
                  </p>
                </div>

                {/* Long */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Long (~250 Words)</h3>
                    <button
                      onClick={() => copyToClipboard(BOILERPLATES.long)}
                      className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="text-slate-400 text-sm leading-relaxed bg-white/[0.04] p-4 rounded-lg border border-white/[0.08] whitespace-pre-line">
                    {BOILERPLATES.long}
                  </div>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Contact */}
          <ScrollReveal delay={0.1}>
            <section id="contact">
              <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Media Contact</h2>
              <div className="card p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">Press Inquiries</div>
                        <a href="mailto:press@spacenexus.us" className="text-white hover:text-indigo-400 transition-colors text-sm font-medium">press@spacenexus.us</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">General Support</div>
                        <a href="mailto:support@spacenexus.us" className="text-white hover:text-purple-400 transition-colors text-sm font-medium">support@spacenexus.us</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">Website</div>
                        <a href="https://spacenexus.us" className="text-white hover:text-emerald-400 transition-colors text-sm font-medium">spacenexus.us</a>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                      <p className="text-slate-500 text-xs leading-relaxed">
                        We typically respond to media inquiries within 24 hours. For urgent requests, include
                        &quot;URGENT&quot; in your subject line. Interviews and product demos available upon request.
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Usage Guidelines</h3>
                    <ul className="text-slate-400 space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Use the SpaceNexus logo on a dark background for best visibility
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Maintain a minimum clear space around the logo equal to the height of the &quot;S&quot;
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Do not alter, distort, or recolor the logo
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Refer to the company as &quot;SpaceNexus&quot; (one word, capital S and N)
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Screenshots may be cropped but not edited or composited
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Link to Press Page */}
          <ScrollReveal delay={0.1}>
            <div className="card p-6 text-center">
              <p className="text-slate-400 text-sm mb-4">
                For press releases, media coverage, approved quotes, and recent news about SpaceNexus, visit our full Press page.
              </p>
              <Link
                href="/press"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
              >
                View Full Press Page
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </ScrollReveal>

          {/* Related Pages */}
          <section className="flex flex-wrap gap-4 justify-center">
            <Link href="/press" className="btn-primary text-sm py-2 px-4">
              Press & Media
            </Link>
            <Link href="/about" className="btn-secondary text-sm py-2 px-4">
              About Us
            </Link>
            <Link href="/contact" className="btn-secondary text-sm py-2 px-4">
              Contact
            </Link>
            <Link href="/features" className="btn-secondary text-sm py-2 px-4">
              Features
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
