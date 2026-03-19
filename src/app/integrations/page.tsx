import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Integrations & Data Sources',
  description: 'SpaceNexus integrates with 50+ data sources including NASA, SpaceX, NOAA, CelesTrak, and more. See all connected APIs and data feeds.',
  alternates: { canonical: 'https://spacenexus.us/integrations' },
};

export const revalidate = 86400;

interface Integration {
  name: string;
  description: string;
  category: string;
  type: 'api' | 'rss' | 'scrape' | 'manual';
  frequency: string;
  free: boolean;
}

const integrations: Integration[] = [
  // Launch & Mission
  { name: 'Launch Library 2', description: 'Comprehensive global launch schedule and mission data', category: 'Launch & Mission', type: 'api', frequency: 'Every 15 min', free: true },
  { name: 'SpaceX API', description: 'Launches, rockets, capsules, Starlink satellite count', category: 'Launch & Mission', type: 'api', frequency: 'Every 30 min', free: true },
  { name: 'NASA API', description: 'APOD, NEO data, mission information', category: 'Launch & Mission', type: 'api', frequency: 'Daily', free: true },

  // Satellite & Orbital
  { name: 'CelesTrak', description: 'TLE data for 10,000+ cataloged objects', category: 'Satellite & Orbital', type: 'api', frequency: 'Every 2 hours', free: true },
  { name: 'NASA EONET', description: 'Natural events on Earth (wildfires, storms, volcanos)', category: 'Satellite & Orbital', type: 'api', frequency: 'Every 4 hours', free: true },

  // Space Weather
  { name: 'NOAA SWPC', description: 'Solar flares, geomagnetic storms, Kp index, CME alerts', category: 'Space Weather', type: 'api', frequency: 'Every 5 min', free: true },
  { name: 'NASA DONKI', description: 'Space weather event notifications and knowledge base', category: 'Space Weather', type: 'api', frequency: 'Every 30 min', free: true },
  { name: 'Helioviewer', description: 'Solar observation imagery from SDO/SOHO', category: 'Space Weather', type: 'api', frequency: 'Every hour', free: true },

  // Government & Financial
  { name: 'USAspending.gov', description: 'Federal space spending and contract awards', category: 'Government & Financial', type: 'api', frequency: 'Daily', free: true },
  { name: 'SAM.gov / SBIR.gov', description: 'Government contract opportunities and SBIR awards', category: 'Government & Financial', type: 'api', frequency: 'Daily', free: true },
  { name: 'SEC EDGAR', description: 'Public company filings (10-K, 10-Q, S-1)', category: 'Government & Financial', type: 'api', frequency: 'Daily', free: true },

  // News & Content
  { name: 'NASA News RSS', description: 'Official NASA news and press releases', category: 'News & Content', type: 'rss', frequency: 'Every 15 min', free: true },
  { name: 'ESA News RSS', description: 'European Space Agency news feed', category: 'News & Content', type: 'rss', frequency: 'Every 15 min', free: true },
  { name: 'Spaceflight News API', description: 'Aggregated space industry news from 50+ sources', category: 'News & Content', type: 'api', frequency: 'Every 15 min', free: true },
  { name: '5 YouTube Channels', description: 'Scott Manley, NASA, SpaceX, Marcus House, and more', category: 'News & Content', type: 'rss', frequency: 'Every 4 hours', free: true },
  { name: '8 Podcast Feeds', description: 'The Space Show, Main Engine Cut Off, and more', category: 'News & Content', type: 'rss', frequency: 'Every 4 hours', free: true },

  // AI & Analytics
  { name: 'Claude AI (Anthropic)', description: 'AI-powered insights generation and fact-checking', category: 'AI & Analytics', type: 'api', frequency: 'Daily', free: false },
  { name: 'Google Analytics 4', description: 'Platform usage analytics and conversion tracking', category: 'AI & Analytics', type: 'api', frequency: 'Real-time', free: true },

  // Payment & Auth
  { name: 'Stripe', description: 'Subscription billing and payment processing', category: 'Infrastructure', type: 'api', frequency: 'Real-time', free: false },
  { name: 'NextAuth.js', description: 'Authentication and session management', category: 'Infrastructure', type: 'api', frequency: 'Real-time', free: true },
];

const typeLabels: Record<string, { label: string; color: string }> = {
  api: { label: 'API', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  rss: { label: 'RSS', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  scrape: { label: 'Scrape', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  manual: { label: 'Manual', color: 'text-slate-400 bg-white/[0.06] border-white/10' },
};

export default function IntegrationsPage() {
  const categories = Array.from(new Set(integrations.map((i) => i.category)));

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Integrations"
          subtitle="50+ data sources powering SpaceNexus intelligence"
          icon="🔌"
          accentColor="cyan"
        >
          <Link href="/data-sources" className="btn-secondary text-sm py-2 px-4">
            Full Data Sources
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Summary Stats */}
          <ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: '50+', label: 'Data Sources' },
                { value: '20+', label: 'API Integrations' },
                { value: '12+', label: 'RSS Feeds' },
                { value: '30+', label: 'Cron Jobs' },
              ].map((stat) => (
                <div key={stat.label} className="card p-4 text-center">
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="text-slate-500 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Integration Categories */}
          {categories.map((category) => (
            <ScrollReveal key={category}>
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">{category}</h2>
                <div className="space-y-2">
                  {integrations
                    .filter((i) => i.category === category)
                    .map((integration) => {
                      const typeConfig = typeLabels[integration.type];
                      return (
                        <div
                          key={integration.name}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white text-sm font-medium">{integration.name}</p>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${typeConfig.color}`}>
                                {typeConfig.label}
                              </span>
                            </div>
                            <p className="text-slate-500 text-xs mt-0.5 truncate">{integration.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-slate-400 text-xs font-mono">{integration.frequency}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </ScrollReveal>
          ))}

          {/* Developer CTA */}
          <ScrollReveal>
            <div className="card p-6 text-center border border-cyan-500/20">
              <h3 className="text-lg font-semibold text-white mb-2">Build on SpaceNexus Data</h3>
              <p className="text-slate-400 text-sm mb-4">
                Access our aggregated data through the SpaceNexus API. 11 public endpoints with OpenAPI documentation.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/developer" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors">
                  Developer Portal
                </Link>
                <Link href="/api-access" className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                  API Pricing
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
