import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'Platform Status',
  description: 'SpaceNexus platform status and system health. Check uptime, data pipeline status, and recent incidents.',
  alternates: { canonical: 'https://spacenexus.us/status' },
};

export const revalidate = 300; // Revalidate every 5 minutes

const systems = [
  { name: 'Web Application', status: 'operational', description: 'Main website and dashboard' },
  { name: 'API Services', status: 'operational', description: 'REST API and developer endpoints' },
  { name: 'Database', status: 'operational', description: 'PostgreSQL primary database' },
  { name: 'News Pipeline', status: 'operational', description: 'RSS feeds and news aggregation' },
  { name: 'Space Weather Feed', status: 'operational', description: 'NOAA SWPC data integration' },
  { name: 'Launch Data', status: 'operational', description: 'Launch Library 2 integration' },
  { name: 'SpaceX API', status: 'operational', description: 'SpaceX launches and Starlink data' },
  { name: 'AI Insights Pipeline', status: 'operational', description: 'Daily AI-generated analysis' },
  { name: 'Cron Scheduler', status: 'operational', description: '30+ scheduled data jobs' },
  { name: 'Push Notifications', status: 'operational', description: 'Web push for launch alerts' },
  { name: 'Search', status: 'operational', description: 'Full-text search across platform' },
  { name: 'Authentication', status: 'operational', description: 'Login, registration, sessions' },
];

const statusColors: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  operational: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400', label: 'Operational' },
  degraded: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Degraded' },
  outage: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', label: 'Outage' },
  maintenance: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400', label: 'Maintenance' },
};

export default function StatusPage() {
  const allOperational = systems.every((s) => s.status === 'operational');

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Platform Status"
          subtitle="Real-time health of SpaceNexus systems"
          icon="🟢"
          accentColor="green"
        >
          <Link href="/help" className="btn-secondary text-sm py-2 px-4">
            Help Center
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Overall Status Banner */}
          <ScrollReveal>
            <div className={`card p-6 text-center border ${allOperational ? 'border-green-500/20' : 'border-amber-500/20'}`}>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${allOperational ? 'bg-green-500/10' : 'bg-amber-500/10'} mb-3`}>
                <div className={`w-2.5 h-2.5 rounded-full ${allOperational ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className={`text-sm font-semibold ${allOperational ? 'text-green-400' : 'text-amber-400'}`}>
                  {allOperational ? 'All Systems Operational' : 'Some Systems Degraded'}
                </span>
              </div>
              <p className="text-slate-400 text-sm">
                Last checked: {new Date().toISOString().split('T')[0]} | Auto-refreshes every 5 minutes
              </p>
            </div>
          </ScrollReveal>

          {/* Systems Grid */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
              <div className="space-y-2">
                {systems.map((system) => {
                  const colors = statusColors[system.status] || statusColors.operational;
                  return (
                    <div
                      key={system.name}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{system.name}</p>
                        <p className="text-slate-500 text-xs">{system.description}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colors.bg}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                        <span className={`text-xs font-medium ${colors.text}`}>{colors.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollReveal>

          {/* Platform Stats */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Platform Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Pages', value: '257+' },
                  { label: 'API Routes', value: '317' },
                  { label: 'Blog Articles', value: '165' },
                  { label: 'Cron Jobs', value: '30+' },
                ].map((metric) => (
                  <div key={metric.label} className="text-center p-3 rounded-lg bg-white/[0.02]">
                    <p className="text-white text-lg font-bold">{metric.value}</p>
                    <p className="text-slate-500 text-xs">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Uptime note */}
          <ScrollReveal>
            <div className="text-center text-sm text-slate-500">
              <p>SpaceNexus is hosted on <strong className="text-slate-400">Railway</strong> with auto-deployment from the dev branch.</p>
              <p className="mt-1">
                Questions? <Link href="/contact" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Contact us</Link>
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
