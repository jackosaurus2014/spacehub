import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Launch Alerts - Never Miss a Liftoff',
  description: 'Get notified before every rocket launch. Set up push notifications for SpaceX, NASA, Rocket Lab, and all orbital launches worldwide.',
  alternates: { canonical: 'https://spacenexus.us/launch-alerts' },
};

export const revalidate = 86400;

const alertTypes = [
  {
    icon: '🚀',
    title: 'Launch Notifications',
    description: 'Get a push notification 1 hour before any orbital launch worldwide. Filter by provider (SpaceX, Rocket Lab, ULA, etc.) or by launch site.',
    setup: 'Mission Control → Enable Notifications',
    href: '/mission-control',
  },
  {
    icon: '☀️',
    title: 'Space Weather Alerts',
    description: 'Receive alerts when the Kp index exceeds your threshold, when X-class solar flares occur, or when CMEs are Earth-directed.',
    setup: 'Space Weather → Set Alert Rules',
    href: '/space-weather',
  },
  {
    icon: '📊',
    title: 'Market & Funding Alerts',
    description: 'Track funding rounds, M&A announcements, and contract awards for companies on your watchlist.',
    setup: 'Watchlists → Add Companies → Enable Alerts',
    href: '/my-watchlists',
  },
  {
    icon: '📋',
    title: 'Regulatory Updates',
    description: 'Stay informed about FCC filings, spectrum decisions, and compliance deadline changes.',
    setup: 'Alerts → Create Regulatory Rule',
    href: '/alerts',
  },
  {
    icon: '📰',
    title: 'News Alerts',
    description: 'Get notified when specific keywords appear in space industry news — company names, technologies, or topics you care about.',
    setup: 'Alerts → Create Keyword Rule',
    href: '/alerts',
  },
];

const platforms = [
  { label: 'Android Push', description: 'Via the SpaceNexus app on Google Play', available: true },
  { label: 'Web Push', description: 'Browser notifications on desktop and mobile web', available: true },
  { label: 'Email Digest', description: 'Daily or weekly summary of triggered alerts', available: true },
  { label: 'iOS Push', description: 'Coming with iOS app launch', available: false },
  { label: 'Slack Integration', description: 'Post alerts to a Slack channel', available: false },
];

export default function LaunchAlertsPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Launch Alerts"
          subtitle="Never miss a launch, storm, or funding round"
          icon="🔔"
          accentColor="amber"
        >
          <Link href="/alerts" className="btn-primary text-sm py-2 px-4">
            Configure Alerts
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Alert Types */}
          <ScrollReveal>
            <div className="space-y-4">
              {alertTypes.map((alert) => (
                <div key={alert.title} className="card p-5">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl shrink-0">{alert.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{alert.title}</h3>
                      <p className="text-slate-400 text-sm mb-2">{alert.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 text-xs">Setup: {alert.setup}</span>
                        <Link href={alert.href} className="text-xs text-cyan-400 hover:text-cyan-300">
                          Go &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Delivery Platforms */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Delivery Platforms</h2>
              <div className="space-y-2">
                {platforms.map((p) => (
                  <div key={p.label} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                    <div>
                      <p className="text-white text-sm font-medium">{p.label}</p>
                      <p className="text-slate-500 text-xs">{p.description}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.available ? 'text-green-400 bg-green-500/10' : 'text-slate-500 bg-white/[0.04]'}`}>
                      {p.available ? 'Available' : 'Coming Soon'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* CTA */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link href="/alerts" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors">
                Set Up Alerts
              </Link>
              <Link href="/app" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                Get push alerts on Android
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
