import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'What Users Say - SpaceNexus',
  description: 'See what the SpaceNexus platform offers space industry professionals. Explore our platform stats, features, and submit your own feedback.',
  alternates: { canonical: 'https://spacenexus.us/testimonials' },
};

export const revalidate = 86400;

const platformHighlights = [
  { stat: '262+', label: 'Pages & Tools', description: 'Dashboards, calculators, trackers, and reference pages' },
  { stat: '175+', label: 'Original Articles', description: 'Guides, analysis, market reports, and technical deep-dives' },
  { stat: '50+', label: 'Data Sources', description: 'NASA, NOAA, SpaceX, CelesTrak, USAspending, and more' },
  { stat: '317', label: 'API Routes', description: 'Backend data endpoints powering the platform' },
  { stat: '30+', label: 'Cron Jobs', description: 'Automated data refresh every 2-60 minutes' },
  { stat: '11', label: 'Public API Endpoints', description: 'Open developer API with OpenAPI docs' },
];

const featureHighlights = [
  {
    title: 'Mission Control',
    description: 'Real-time launch countdowns, mission tracking, and event calendar with data from Launch Library 2.',
    href: '/mission-control',
  },
  {
    title: 'Satellite Tracker',
    description: 'Track 10,000+ cataloged objects including Starlink, ISS, and classified payloads using CelesTrak TLE data.',
    href: '/satellites',
  },
  {
    title: 'Market Intelligence',
    description: 'Space stocks, funding rounds, M&A activity, and company profiles aggregated from SEC and industry sources.',
    href: '/market-intel',
  },
  {
    title: 'Engineering Tools',
    description: 'Orbital, thermal, radiation, power budget, and link budget calculators — free in the browser.',
    href: '/tools',
  },
  {
    title: 'Space Weather',
    description: 'Solar flares, Kp index, CME tracking, and aurora forecasts from NOAA SWPC data.',
    href: '/space-weather',
  },
  {
    title: 'Compliance Hub',
    description: 'ITAR/EAR reference, regulatory calendar, licensing checker, and export classification tools.',
    href: '/compliance',
  },
];

export default function TestimonialsPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Why SpaceNexus"
          subtitle="Built for space industry professionals — powered by real data"
          icon="🚀"
          accentColor="cyan"
        >
          <Link href="/register" className="btn-primary text-sm py-2 px-4">
            Start Free
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Platform Stats */}
          <ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {platformHighlights.map((item) => (
                <div key={item.label} className="card p-4 text-center">
                  <p className="text-2xl font-bold text-white">{item.stat}</p>
                  <p className="text-slate-300 text-sm font-medium">{item.label}</p>
                  <p className="text-slate-500 text-xs mt-1">{item.description}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Feature Highlights */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">What You Get — Free to Start</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {featureHighlights.map((feature) => (
                  <Link
                    key={feature.title}
                    href={feature.href}
                    className="p-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-all"
                  >
                    <p className="text-white text-sm font-medium mb-1">{feature.title}</p>
                    <p className="text-slate-500 text-xs leading-relaxed">{feature.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Share Your Experience CTA */}
          <ScrollReveal>
            <div className="card p-8 text-center border border-cyan-500/20">
              <h3 className="text-xl font-bold text-white mb-2">Share Your Experience</h3>
              <p className="text-slate-400 text-sm mb-5 max-w-md mx-auto">
                Using SpaceNexus for your work? We&apos;d love to hear how it helps.
                Your feedback shapes our roadmap and helps other professionals discover the platform.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors">
                  Send Feedback
                </Link>
                <Link href="/community/forums" className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                  Join the Community
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Getting Started */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link href="/register" className="text-white hover:text-cyan-300 underline underline-offset-2 font-medium">
                Create Free Account
              </Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/app" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">
                Get the Android App
              </Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/features" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">
                Browse All Features
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
