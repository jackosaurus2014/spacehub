import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Product Roadmap',
  description: 'See what\'s next for SpaceNexus. Our public roadmap covers upcoming features, integrations, and platform improvements for 2026 and beyond.',
  alternates: { canonical: 'https://spacenexus.us/roadmap' },
};

export const revalidate = 86400;

interface RoadmapItem {
  title: string;
  description: string;
  status: 'shipped' | 'in-progress' | 'planned' | 'exploring';
  quarter: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  shipped: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400', label: 'Shipped' },
  'in-progress': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400 animate-pulse', label: 'In Progress' },
  planned: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Planned' },
  exploring: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400', label: 'Exploring' },
};

const roadmapItems: RoadmapItem[] = [
  // Q1 2026 — Shipped
  { title: 'Platform Launch', description: 'Core modules: Mission Control, Market Intel, Satellite Tracker, News, Company Profiles', status: 'shipped', quarter: 'Q1 2026' },
  { title: '160+ Blog Articles', description: 'Original content library covering investment, technology, policy, and guides', status: 'shipped', quarter: 'Q1 2026' },
  { title: 'Community Forums', description: 'Threaded discussions, voting, moderation, and user profiles', status: 'shipped', quarter: 'Q1 2026' },
  { title: 'Marketplace', description: 'Space industry procurement: listings, RFQ, proposals, AI copilot', status: 'shipped', quarter: 'Q1 2026' },
  { title: 'Developer API v1', description: 'Public REST API with 11 endpoints and OpenAPI spec', status: 'shipped', quarter: 'Q1 2026' },
  { title: 'Engineering Tools Suite', description: 'Orbital, thermal, radiation, power, link budget calculators + constellation designer', status: 'shipped', quarter: 'Q1 2026' },
  { title: 'Android App on Google Play', description: 'Full platform as TWA with push notifications and offline support', status: 'shipped', quarter: 'Q1 2026' },
  { title: 'AI Insights Pipeline', description: 'Daily AI-generated analysis with fact-checking and editorial review', status: 'shipped', quarter: 'Q1 2026' },

  // Q2 2026 — In Progress & Planned
  { title: 'Push Notification Channels', description: 'Subscribe to specific alert types: launches, funding rounds, space weather, regulatory updates', status: 'in-progress', quarter: 'Q2 2026' },
  { title: 'iOS App Store Launch', description: 'Bring SpaceNexus to iPhone and iPad with native capabilities', status: 'in-progress', quarter: 'Q2 2026' },
  { title: 'Home Screen Widgets', description: 'At-a-glance countdown timers, market snapshots, and weather alerts for Android', status: 'planned', quarter: 'Q2 2026' },
  { title: 'Real-Time WebSocket Feeds', description: 'Live data streaming for launch events, market changes, and space weather', status: 'planned', quarter: 'Q2 2026' },
  { title: 'Team Workspaces', description: 'Shared dashboards, saved searches, and collaborative watchlists for organizations', status: 'planned', quarter: 'Q2 2026' },
  { title: 'API v2 with GraphQL', description: 'Flexible query API for developers building on SpaceNexus data', status: 'planned', quarter: 'Q2 2026' },

  // Q3-Q4 2026 — Exploring
  { title: 'Internationalization (i18n)', description: 'Multi-language support starting with Spanish, Mandarin, and French', status: 'exploring', quarter: 'H2 2026' },
  { title: 'Wearable Integration', description: 'Launch alerts and space weather on smartwatches (Wear OS, Apple Watch)', status: 'exploring', quarter: 'H2 2026' },
  { title: 'Content Partnerships', description: 'Syndicated content from space research firms and university programs', status: 'exploring', quarter: 'H2 2026' },
  { title: 'AI-Powered Market Predictions', description: 'Predictive analytics for funding trends, launch outcomes, and regulatory changes', status: 'exploring', quarter: 'H2 2026' },
  { title: 'Satellite Imagery Integration', description: 'Preview and analyze satellite imagery within the platform', status: 'exploring', quarter: 'H2 2026' },
];

export default function RoadmapPage() {
  const quarters = Array.from(new Set(roadmapItems.map((item) => item.quarter)));

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Product Roadmap"
          subtitle="What we're building next at SpaceNexus"
          icon="🗺️"
          accentColor="cyan"
        >
          <Link href="/changelog" className="btn-secondary text-sm py-2 px-4">
            View Changelog
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-3xl mx-auto space-y-8">
          {/* Legend */}
          <ScrollReveal>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              {Object.entries(statusConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <span className={config.text}>{config.label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Timeline */}
          {quarters.map((quarter) => (
            <ScrollReveal key={quarter}>
              <div className="card p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-xs font-mono text-slate-400">
                    {quarter.slice(0, 2)}
                  </span>
                  {quarter}
                </h2>
                <div className="space-y-3">
                  {roadmapItems
                    .filter((item) => item.quarter === quarter)
                    .map((item) => {
                      const config = statusConfig[item.status];
                      return (
                        <div
                          key={item.title}
                          className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${config.bg} shrink-0 mt-0.5`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                            <span className={`text-[10px] font-medium ${config.text}`}>{config.label}</span>
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{item.title}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </ScrollReveal>
          ))}

          {/* Feedback CTA */}
          <ScrollReveal>
            <div className="card p-6 text-center border border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white mb-2">Have a Feature Request?</h3>
              <p className="text-slate-400 text-sm mb-4">
                We build based on what the community needs. Let us know what would make SpaceNexus more valuable for you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/contact" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors">
                  Submit a Request
                </Link>
                <Link href="/community/forums" className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                  Discuss on Forums
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
