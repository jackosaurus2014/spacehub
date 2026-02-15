import { Metadata } from 'next';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

export const metadata: Metadata = {
  title: 'Press Kit & Media Resources',
  description: 'SpaceNexus press kit with company information, logos, screenshots, boilerplate descriptions, and media contact details for journalists and analysts.',
  keywords: ['SpaceNexus press kit', 'space industry press', 'SpaceNexus media', 'aerospace startup press'],
  openGraph: {
    title: 'SpaceNexus Press Kit & Media Resources',
    description: 'Download logos, screenshots, and company information for media coverage of SpaceNexus.',
    url: 'https://spacenexus.us/press',
  },
  alternates: {
    canonical: 'https://spacenexus.us/press',
  },
};

export const revalidate = 86400;

const KEY_STATS = [
  { label: 'Modules', value: '10+', description: 'Integrated intelligence modules' },
  { label: 'Company Profiles', value: '200+', description: 'Space companies tracked' },
  { label: 'News Sources', value: '50+', description: 'Curated RSS feeds and blogs' },
  { label: 'Satellites Tracked', value: '19,000+', description: 'Active orbital objects' },
  { label: 'Data Sources', value: '26+', description: 'APIs and data feeds' },
  { label: 'Launches Monitored', value: 'All', description: 'Global orbital and suborbital' },
];

const LOGO_ASSETS = [
  { name: 'Full Logo (PNG)', description: 'Primary logo on transparent background', file: 'spacenexus-logo.png' },
  { name: 'App Icon (512x512)', description: 'Square app icon for app stores', file: 'icons/icon-512x512.png' },
  { name: 'Favicon', description: 'Browser tab icon', file: 'favicon-32x32.png' },
];

export default function PressPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <PageHeader
          title="Press Kit & Media Resources"
          subtitle="Everything journalists, analysts, and partners need to cover SpaceNexus"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Press' }]}
        />

        <div className="max-w-5xl mx-auto space-y-12">

          {/* Company Overview */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Company Overview</h2>
            <div className="card p-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">About SpaceNexus</h3>
                <p className="text-slate-400 leading-relaxed">
                  SpaceNexus is a space industry intelligence platform that consolidates real-time data, market analytics,
                  and business tools into a single, accessible platform. With 10 integrated modules covering launches,
                  satellite tracking, market intelligence, procurement, company profiles, and regulatory compliance,
                  SpaceNexus replaces dozens of expensive, fragmented data sources. The platform aggregates data from
                  NASA, NOAA, SAM.gov, and 50+ industry feeds, serving space startups, defense contractors, investors,
                  engineers, and government agencies. Available as a progressive web app with native Android and iOS apps,
                  SpaceNexus offers free, Professional, and Enterprise tiers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Quick Facts</h4>
                  <ul className="text-slate-400 space-y-1 text-sm">
                    <li><strong className="text-slate-600">Founded:</strong> 2024</li>
                    <li><strong className="text-slate-600">Headquarters:</strong> Houston, TX</li>
                    <li><strong className="text-slate-600">Company:</strong> SpaceNexus LLC</li>
                    <li><strong className="text-slate-600">Industry:</strong> Space Intelligence / SaaS</li>
                    <li><strong className="text-slate-600">Model:</strong> Freemium (Free / Pro $29/mo / Enterprise $99/mo)</li>
                    <li><strong className="text-slate-600">Platforms:</strong> Web (PWA), Android, iOS</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Key Differentiators</h4>
                  <ul className="text-slate-400 space-y-1 text-sm list-disc list-inside">
                    <li>Only platform combining 10 modules of space intelligence</li>
                    <li>Freemium model vs. $10K+ enterprise-only competitors</li>
                    <li>Real-time data vs. periodic static reports</li>
                    <li>AI-powered insights via Claude</li>
                    <li>Mobile-first PWA with offline support</li>
                    <li>B2B marketplace for space industry</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Key Statistics */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Key Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {KEY_STATS.map((stat) => (
                <div key={stat.label} className="card p-6 text-center">
                  <div className="text-3xl font-bold text-cyan-400 mb-1">{stat.value}</div>
                  <div className="text-sm font-semibold text-slate-900">{stat.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.description}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Boilerplate Descriptions */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Boilerplate Descriptions</h2>
            <div className="card p-8 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">50 Words</h3>
                <p className="text-slate-400 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                  SpaceNexus is a space industry intelligence platform that consolidates real-time launches,
                  satellite tracking, market analytics, procurement intelligence, and 200+ company profiles into one
                  accessible platform. Serving aerospace professionals, investors, and government agencies, SpaceNexus
                  democratizes access to the data powering the $1.8 trillion space economy.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">100 Words</h3>
                <p className="text-slate-400 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                  SpaceNexus is a space industry intelligence platform that consolidates real-time data, market
                  analytics, and business tools into a single, accessible platform. With 10 integrated modules
                  covering launches, satellite tracking, market intelligence, procurement, company profiles, and
                  regulatory compliance, SpaceNexus replaces dozens of expensive, fragmented data sources. The
                  platform aggregates data from NASA, NOAA, SAM.gov, and 50+ industry feeds, serving space startups,
                  defense contractors, investors, engineers, and government agencies. Available as a progressive web
                  app with offline support, SpaceNexus offers free, Professional, and Enterprise tiers. Learn more
                  at spacenexus.us.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">250 Words</h3>
                <p className="text-slate-400 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                  SpaceNexus is the most comprehensive space industry intelligence platform available, designed
                  to serve the rapidly growing $1.8 trillion global space economy. The platform integrates 10
                  core modules&mdash;Mission Control, News &amp; Media, Space Market Intelligence, Business
                  Opportunities, Mission Planning, Space Operations, Space Talent Hub, Regulatory &amp; Compliance,
                  Solar System Expansion, and Space Environment&mdash;into a unified interface that replaces dozens
                  of fragmented, expensive data sources.<br /><br />
                  SpaceNexus aggregates real-time data from NASA, NOAA, SAM.gov, the FCC, and over 50 curated
                  news and analysis sources. Users can track every orbital and suborbital launch worldwide,
                  monitor 19,000+ satellites on an interactive 3D globe, access detailed profiles of 200+ space
                  companies with financial data and competitive analysis, and discover government procurement
                  opportunities through integrated SAM.gov and SBIR/STTR intelligence.<br /><br />
                  The platform leverages AI to categorize news, tag company mentions, generate market insights,
                  and power an intelligent procurement copilot. SpaceNexus serves aerospace engineers, defense
                  contractors, investors, startup founders, government program managers, journalists, and space
                  enthusiasts alike.<br /><br />
                  Unlike legacy competitors charging $10,000-50,000+ per year for narrow data sets, SpaceNexus
                  offers a free Explorer tier alongside Professional ($29/month) and Enterprise ($99/month) plans,
                  democratizing access to space industry intelligence. The platform is available as a responsive
                  web application with progressive web app capabilities and native Android and iOS mobile apps.
                  Founded in 2024 and headquartered in Houston, Texas, SpaceNexus LLC is building the Bloomberg
                  Terminal of the space economy.
                </p>
              </div>
            </div>
          </section>

          {/* Brand Assets */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Brand Assets</h2>
            <div className="card p-8">
              <p className="text-slate-400 mb-6 text-sm">
                Download SpaceNexus logos and brand assets for use in articles, presentations, and media coverage.
                Please do not modify the logos or change the brand colors.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {LOGO_ASSETS.map((asset) => (
                  <div key={asset.name} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="bg-[#0f172a] rounded-lg p-4 mb-3 flex items-center justify-center h-24">
                      <span className="text-cyan-400 font-bold text-lg">SN</span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">{asset.name}</h4>
                    <p className="text-slate-400 text-xs mt-1">{asset.description}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Brand Colors</h3>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-slate-300" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Space Navy</div>
                      <div className="text-xs text-slate-400">#0f172a</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#06b6d4] border border-slate-300" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Cyan Accent</div>
                      <div className="text-xs text-slate-400">#06b6d4</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#7c3aed] border border-slate-300" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Nebula Purple</div>
                      <div className="text-xs text-slate-400">#7c3aed</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#10b981] border border-slate-300" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Success Green</div>
                      <div className="text-xs text-slate-400">#10b981</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Product Screenshots */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Product Screenshots</h2>
            <div className="card p-8">
              <p className="text-slate-400 mb-6 text-sm">
                High-resolution screenshots of the SpaceNexus platform for media use.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="bg-[#0f172a] rounded-lg p-4 mb-3 h-32 flex items-center justify-center">
                    <span className="text-slate-500 text-sm">Mission Control Dashboard</span>
                  </div>
                  <p className="text-xs text-slate-400">Real-time dashboard with launches, market data, and news</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="bg-[#0f172a] rounded-lg p-4 mb-3 h-32 flex items-center justify-center">
                    <span className="text-slate-500 text-sm">Satellite Tracker (3D Globe)</span>
                  </div>
                  <p className="text-xs text-slate-400">Interactive 3D globe tracking 19,000+ satellites</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="bg-[#0f172a] rounded-lg p-4 mb-3 h-32 flex items-center justify-center">
                    <span className="text-slate-500 text-sm">Company Profiles Directory</span>
                  </div>
                  <p className="text-xs text-slate-400">200+ company profiles with financial data and analysis</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="bg-[#0f172a] rounded-lg p-4 mb-3 h-32 flex items-center justify-center">
                    <span className="text-slate-500 text-sm">Market Intelligence Dashboard</span>
                  </div>
                  <p className="text-xs text-slate-400">Space economy tracking with stocks, ETFs, and funding data</p>
                </div>
              </div>
            </div>
          </section>

          {/* Media Contact */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Media Contact</h2>
            <div className="card p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Press Inquiries</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-400"><strong className="text-slate-600">Email:</strong> press@spacenexus.us</p>
                    <p className="text-slate-400"><strong className="text-slate-600">General:</strong> support@spacenexus.us</p>
                    <p className="text-slate-400"><strong className="text-slate-600">Website:</strong>{' '}
                      <a href="https://spacenexus.us" className="text-cyan-500 hover:underline">spacenexus.us</a>
                    </p>
                  </div>
                  <p className="text-slate-400 text-xs mt-4">
                    We typically respond to media inquiries within 24 hours. For urgent requests, please include
                    &quot;URGENT&quot; in your subject line.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Follow Us</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-400"><strong className="text-slate-600">LinkedIn:</strong>{' '}
                      <a href="https://linkedin.com/company/spacenexus" className="text-cyan-500 hover:underline" target="_blank" rel="noopener noreferrer">SpaceNexus LLC</a>
                    </p>
                    <p className="text-slate-400"><strong className="text-slate-600">Twitter/X:</strong>{' '}
                      <a href="https://twitter.com/spacenexus" className="text-cyan-500 hover:underline" target="_blank" rel="noopener noreferrer">@spacenexus</a>
                    </p>
                    <p className="text-slate-400"><strong className="text-slate-600">GitHub:</strong>{' '}
                      <a href="https://github.com/jackosaurus2014/spacehub" className="text-cyan-500 hover:underline" target="_blank" rel="noopener noreferrer">jackosaurus2014/spacehub</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Approved Quotes */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Approved Quotes</h2>
            <div className="card p-8 space-y-6">
              <blockquote className="border-l-4 border-cyan-500 pl-4">
                <p className="text-slate-400 italic leading-relaxed">
                  &quot;The space industry has been making decisions with fragmented, expensive data for too long.
                  SpaceNexus brings everything together&mdash;launches, markets, companies, procurement, compliance&mdash;into
                  one platform that anyone can access. We&apos;re building the Bloomberg Terminal of the space economy.&quot;
                </p>
                <cite className="text-slate-500 text-sm mt-2 block">&mdash; Founder, SpaceNexus</cite>
              </blockquote>

              <blockquote className="border-l-4 border-nebula-500 pl-4">
                <p className="text-slate-400 italic leading-relaxed">
                  &quot;Our competitors charge $10,000 to $50,000 per year for narrow datasets. SpaceNexus offers
                  10 integrated modules starting at free. We believe democratizing space intelligence accelerates
                  the entire industry.&quot;
                </p>
                <cite className="text-slate-500 text-sm mt-2 block">&mdash; Founder, SpaceNexus</cite>
              </blockquote>
            </div>
          </section>

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
          </section>
        </div>
      </div>
    </div>
  );
}
