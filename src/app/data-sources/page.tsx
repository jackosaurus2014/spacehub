'use client';

import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

interface DataSource {
  name: string;
  description: string;
  updateFrequency: string;
  tier: 'Free' | 'Free (Rate Limited)' | 'Free + Paid' | 'Paid' | 'Proprietary';
}

interface DataCategory {
  title: string;
  description: string;
  icon: JSX.Element;
  accentColor: string;
  sources: DataSource[];
}

const dataCategories: DataCategory[] = [
  {
    title: 'Government APIs',
    description: 'Official data from U.S. government agencies and space organizations',
    accentColor: 'text-blue-400',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    sources: [
      {
        name: 'NASA APOD',
        description: 'Astronomy Picture of the Day with expert explanations and high-resolution imagery',
        updateFrequency: 'Daily',
        tier: 'Free',
      },
      {
        name: 'NASA EONET',
        description: 'Earth Observatory Natural Event Tracker for wildfires, storms, volcanic activity, and more',
        updateFrequency: 'Real-time',
        tier: 'Free',
      },
      {
        name: 'NASA Techport',
        description: 'NASA technology investment portfolio including active projects, TRL levels, and budgets',
        updateFrequency: 'Weekly',
        tier: 'Free',
      },
      {
        name: 'NASA NEO (CNEOS)',
        description: 'Near-Earth Object tracking with close approach data, sizes, and orbital parameters',
        updateFrequency: 'Daily',
        tier: 'Free',
      },
      {
        name: 'NOAA SWPC',
        description: 'Space Weather Prediction Center data including solar wind, geomagnetic storms, and Kp index forecasts',
        updateFrequency: 'Every 5 min',
        tier: 'Free',
      },
      {
        name: 'SAM.gov',
        description: 'System for Award Management with government contract opportunities, awards, and entity registrations',
        updateFrequency: 'Daily',
        tier: 'Free',
      },
      {
        name: 'FCC ECFS',
        description: 'Electronic Comment Filing System for satellite licensing, spectrum allocation filings, and regulatory proceedings',
        updateFrequency: 'Daily',
        tier: 'Free',
      },
      {
        name: 'SEC EDGAR',
        description: 'Electronic Data Gathering for public company filings (10-K, 10-Q, 8-K, S-1) of publicly traded space companies',
        updateFrequency: 'Real-time',
        tier: 'Free',
      },
      {
        name: 'USAspending.gov',
        description: 'Federal spending data including space-related contract awards, grant disbursements, and agency budgets',
        updateFrequency: 'Daily',
        tier: 'Free',
      },
    ],
  },
  {
    title: 'Space Agency Feeds',
    description: 'International space agency news, mission data, and program updates',
    accentColor: 'text-purple-400',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    sources: [
      {
        name: 'ESA (European Space Agency)',
        description: 'Mission updates, science results, Earth observation data, and Ariane/Vega launch program news',
        updateFrequency: 'Daily',
        tier: 'Free',
      },
      {
        name: 'JAXA (Japan Aerospace Exploration Agency)',
        description: 'H3 launch vehicle updates, Hayabusa sample return results, ISS Kibo module operations, and lunar exploration',
        updateFrequency: 'Weekly',
        tier: 'Free',
      },
      {
        name: 'ISRO (Indian Space Research Organisation)',
        description: 'PSLV/GSLV launch manifests, Chandrayaan and Gaganyaan program updates, and remote sensing services',
        updateFrequency: 'Weekly',
        tier: 'Free',
      },
    ],
  },
  {
    title: 'Industry Data Providers',
    description: 'Real-time market, satellite tracking, and financial data from commercial providers',
    accentColor: 'text-emerald-400',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    sources: [
      {
        name: 'Finnhub',
        description: 'Real-time and historical stock data for publicly traded space companies (RKLB, ASTS, LUNR, etc.)',
        updateFrequency: 'Real-time',
        tier: 'Free + Paid',
      },
      {
        name: 'CelesTrak (TLE Data)',
        description: 'Two-Line Element sets for 19,000+ tracked objects including active satellites, debris, and rocket bodies',
        updateFrequency: 'Every 2 hours',
        tier: 'Free',
      },
      {
        name: 'N2YO',
        description: 'Satellite pass predictions, real-time tracking, and visual magnitude data for observable satellites',
        updateFrequency: 'Real-time',
        tier: 'Free (Rate Limited)',
      },
    ],
  },
  {
    title: 'News Aggregation',
    description: 'Curated RSS feeds from 50+ trusted space industry publications and media outlets',
    accentColor: 'text-amber-400',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
    sources: [
      {
        name: 'SpaceNews',
        description: 'Industry-leading coverage of commercial, military, and civil space policy, business, and technology',
        updateFrequency: 'Hourly',
        tier: 'Free',
      },
      {
        name: 'Ars Technica (Space)',
        description: 'In-depth technical reporting on launch vehicles, missions, and aerospace engineering developments',
        updateFrequency: 'Daily',
        tier: 'Free',
      },
      {
        name: 'NASASpaceFlight.com',
        description: 'Detailed launch coverage, vehicle development tracking, and community-driven space journalism',
        updateFrequency: 'Hourly',
        tier: 'Free',
      },
      {
        name: 'Space.com',
        description: 'Accessible space news covering launches, astronomy, planetary science, and human spaceflight',
        updateFrequency: 'Hourly',
        tier: 'Free',
      },
      {
        name: 'The Verge (Space)',
        description: 'Technology-focused coverage of commercial space, launch events, and industry disruption',
        updateFrequency: 'Daily',
        tier: 'Free',
      },
      {
        name: '50+ Additional RSS Feeds',
        description: 'Including Reuters Space, Aviation Week, Payload Space, The War Zone, SpacePolicyOnline, ESA News, NASA Blogs, and regional publications',
        updateFrequency: 'Continuous',
        tier: 'Free',
      },
    ],
  },
  {
    title: 'Community Content',
    description: 'Curated video and podcast channels from the space community',
    accentColor: 'text-red-400',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
      </svg>
    ),
    sources: [
      {
        name: 'YouTube Channels (5)',
        description: 'Everyday Astronaut, Scott Manley, Marcus House, NASASpaceflight, SpaceX official channel for launch coverage and analysis',
        updateFrequency: 'Daily',
        tier: 'Free',
      },
      {
        name: 'Podcast Feeds (8)',
        description: 'The Space Show, Off-Nominal, Main Engine Cut Off, WeMartians, Orbital Mechanics, T-Minus Space Daily, Space Biz, and The Orbital Perspective',
        updateFrequency: 'Weekly',
        tier: 'Free',
      },
    ],
  },
  {
    title: 'Proprietary Intelligence',
    description: 'AI-generated analysis and proprietary data processing by SpaceNexus',
    accentColor: 'text-cyan-400',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    sources: [
      {
        name: 'Claude API (Anthropic)',
        description: 'AI-generated market insights, company research summaries, investment theses, regulatory explainers, and trend analysis',
        updateFrequency: 'On demand',
        tier: 'Proprietary',
      },
      {
        name: 'SpaceNexus Scoring Engine',
        description: 'Proprietary Space Score algorithm rating companies across 6 dimensions: technology, financials, team, market position, growth, and ESG',
        updateFrequency: 'Weekly',
        tier: 'Proprietary',
      },
      {
        name: 'News Categorization AI',
        description: 'Automated article tagging, company mention detection, sentiment analysis, and topic clustering across 50+ news sources',
        updateFrequency: 'Continuous',
        tier: 'Proprietary',
      },
      {
        name: 'Trend Detection',
        description: 'Cross-source pattern recognition identifying emerging themes, funding shifts, and regulatory changes across the space industry',
        updateFrequency: 'Daily',
        tier: 'Proprietary',
      },
    ],
  },
];

const tierStyles: Record<string, string> = {
  'Free': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Free (Rate Limited)': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Free + Paid': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Paid': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Proprietary': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

export default function DataSourcesPage() {
  const totalSources = dataCategories.reduce((sum, cat) => sum + cat.sources.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Hero */}
        <AnimatedPageHeader
          title="Our Data Sources"
          subtitle="Transparency in how SpaceNexus gathers and processes space industry data"
          accentColor="cyan"
        />

        {/* Stats bar */}
        <ScrollReveal className="mt-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: `${totalSources}+`, label: 'Data Sources' },
              { value: '6', label: 'Categories' },
              { value: '50+', label: 'RSS Feeds' },
              { value: '24/7', label: 'Data Freshness' },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 text-center">
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-300 to-cyan-500 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Transparency statement */}
        <ScrollReveal className="mt-10">
          <div className="card p-6 md:p-8 border border-cyan-500/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Our Commitment to Transparency</h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  SpaceNexus aggregates data exclusively from publicly available APIs, official government feeds,
                  and licensed commercial providers. We do not scrape private data or use unauthorized sources.
                  Every data point on our platform can be traced back to the original source listed here.
                  When AI is used to generate insights, it is clearly labeled as AI-generated content.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Data source categories */}
        <div className="mt-12 space-y-10">
          {dataCategories.map((category, categoryIdx) => (
            <ScrollReveal key={category.title}>
              <div className="card overflow-hidden">
                {/* Category header */}
                <div className="p-6 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center ${category.accentColor}`}>
                      {category.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold text-white">
                        {category.title}
                      </h2>
                      <p className="text-sm text-slate-400 mt-0.5">{category.description}</p>
                    </div>
                    <span className="ml-auto text-xs text-slate-500 font-mono bg-white/[0.04] px-2 py-1 rounded">
                      {category.sources.length} source{category.sources.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Sources table */}
                <div className="divide-y divide-white/[0.04]">
                  {category.sources.map((source) => (
                    <div
                      key={source.name}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white">{source.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{source.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                          {source.updateFrequency}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierStyles[source.tier]}`}>
                          {source.tier}
                        </span>

        <RelatedModules modules={PAGE_RELATIONS['data-sources']} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Data processing note */}
        <ScrollReveal className="mt-12">
          <div className="card p-6 md:p-8">
            <h2 className="text-xl font-display font-bold text-white mb-4">How We Process Data</h2>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.1}>
              {[
                {
                  step: '1',
                  title: 'Ingest & Validate',
                  desc: 'Automated fetchers pull data from each source on their respective schedules. All inputs are validated, sanitized, and deduplicated before storage.',
                },
                {
                  step: '2',
                  title: 'Enrich & Correlate',
                  desc: 'Our AI pipeline cross-references data across sources, tags companies mentioned in news, and detects emerging patterns across the industry.',
                },
                {
                  step: '3',
                  title: 'Deliver & Cache',
                  desc: 'Processed data is served through our API with circuit breaker protection and TTL caching. Stale data is flagged, and fallbacks ensure uptime.',
                },
              ].map((item) => (
                <StaggerItem key={item.step}>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-3">
                      <span className="text-sm font-bold text-slate-300">{item.step}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal className="mt-12">
          <div className="card p-8 text-center bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08]">
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">
              Have a data source suggestion?
            </h2>
            <p className="text-sm text-slate-300 mb-6 max-w-xl mx-auto">
              We are always expanding our data coverage. If you know of a reliable data source
              that would benefit the space industry community, let us know.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl shadow-lg shadow-black/15 hover:shadow-black/20 transition-all duration-300 text-sm"
              >
                Suggest a Data Source
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/10 transition-all duration-300 text-sm"
              >
                Learn More About Us
              </Link>
            </div>
          </div>
        </ScrollReveal>

        <div className="mb-16" />
      </div>
    </div>
  );
}
