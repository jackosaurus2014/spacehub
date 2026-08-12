'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { SITE_STATS } from '@/lib/site-stats';

interface HealthCheck {
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}

interface CronJob {
  label: string;
  schedule: string;
  lastSuccessAt: string | null;
  lastFailureAt?: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  isStale: boolean;
}

interface CronStatus {
  schedulerUpSince?: string | null;
  uptimeMinutes?: number;
  jobs?: CronJob[];
  summary?: { total: number; healthy: number; stale: number; failing: number };
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  checks: {
    database?: HealthCheck;
    memory?: HealthCheck;
    uptime?: HealthCheck;
  };
  cron?: CronStatus;
}

type ComponentState = 'operational' | 'degraded' | 'outage';

const STATE_STYLES: Record<ComponentState, { bg: string; text: string; dot: string; label: string }> = {
  operational: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400', label: 'Operational' },
  degraded: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Degraded' },
  outage: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', label: 'Outage' },
};

function StatusPill({ state }: { state: ComponentState }) {
  const s = STATE_STYLES[state];
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.bg}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
    </div>
  );
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health?detailed=true', { cache: 'no-store' });
      // The endpoint returns 503 with a JSON body when degraded — still valid data.
      const data = (await res.json()) as HealthResponse;
      if (!data || !data.status) throw new Error('Malformed health payload');
      setHealth(data);
      setFetchFailed(false);
      setLastChecked(new Date());
    } catch {
      setHealth(null);
      setFetchFailed(true);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Derive per-component states from real probe data
  const dbCheck = health?.checks?.database;
  const dbState: ComponentState = !dbCheck ? 'outage' : dbCheck.status === 'ok' ? 'operational' : 'outage';

  // If we received any response from /api/health, the API server answered.
  const apiState: ComponentState = health ? 'operational' : 'outage';

  const cron = health?.cron;
  const cronSummary = cron?.summary;
  const pipelineState: ComponentState = !cronSummary
    ? 'degraded'
    : cronSummary.stale > 0 || cronSummary.failing > 0
      ? 'degraded'
      : 'operational';

  const unhealthyJobs = (cron?.jobs ?? []).filter((j) => j.isStale || j.consecutiveFailures > 0);

  const overallHealthy = health?.status === 'healthy' && pipelineState === 'operational';

  const components: Array<{ name: string; description: string; state: ComponentState }> = [
    {
      name: 'Database',
      description: dbCheck?.status === 'ok'
        ? `PostgreSQL primary — responding in ${dbCheck.latencyMs ?? '?'} ms`
        : dbCheck?.error
          ? `PostgreSQL primary — ${dbCheck.error}`
          : 'PostgreSQL primary database',
      state: dbState,
    },
    {
      name: 'API Server',
      description: health
        ? 'REST API and web application — responding'
        : 'REST API and web application',
      state: apiState,
    },
    {
      name: 'Data Pipeline',
      description: cronSummary
        ? `${cronSummary.healthy}/${cronSummary.total} scheduled jobs healthy${cronSummary.stale > 0 ? `, ${cronSummary.stale} stale` : ''}${cronSummary.failing > 0 ? `, ${cronSummary.failing} failing` : ''}`
        : 'Scheduled data jobs (status unavailable)',
      state: pipelineState,
    },
  ];

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Platform Status"
          subtitle="Live health of SpaceNexus systems, probed directly from production"
          accentColor="green"
        >
          <Link href="/help" className="btn-secondary text-sm py-2 px-4">
            Help Center
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Overall Status Banner */}
          <ScrollReveal>
            {loading ? (
              <div className="card p-6 text-center border border-white/10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse" />
                  <span className="text-sm font-semibold text-slate-300">Checking systems&hellip;</span>
                </div>
                <p className="text-slate-400 text-sm">Running a live health probe.</p>
              </div>
            ) : fetchFailed ? (
              <div className="card p-6 text-center border border-red-500/20">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-sm font-semibold text-red-400">Status probe unreachable</span>
                </div>
                <p className="text-slate-400 text-sm">
                  We couldn&apos;t reach the health endpoint from your browser. This may indicate an
                  outage, or a network issue on your side. We retry automatically every 60 seconds.
                </p>
              </div>
            ) : (
              <div className={`card p-6 text-center border ${overallHealthy ? 'border-green-500/20' : 'border-amber-500/20'}`}>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${overallHealthy ? 'bg-green-500/10' : 'bg-amber-500/10'} mb-3`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${overallHealthy ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className={`text-sm font-semibold ${overallHealthy ? 'text-green-400' : 'text-amber-400'}`}>
                    {overallHealthy ? 'All Systems Operational' : 'Some Systems Degraded'}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">
                  Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : '—'} &middot; Auto-refreshes every 60 seconds
                </p>
              </div>
            )}
          </ScrollReveal>

          {/* Component Status */}
          {!loading && !fetchFailed && health && (
            <ScrollReveal>
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Components</h2>
                <div className="space-y-2">
                  {components.map((component) => (
                    <div
                      key={component.name}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{component.name}</p>
                        <p className="text-slate-500 text-xs">{component.description}</p>
                      </div>
                      <StatusPill state={component.state} />
                    </div>
                  ))}
                </div>
                {cron?.schedulerUpSince && (
                  <p className="text-slate-500 text-xs mt-4">
                    Job scheduler running since {new Date(cron.schedulerUpSince).toLocaleString()}
                    {typeof cron.uptimeMinutes === 'number' ? ` (${Math.floor(cron.uptimeMinutes / 60)}h ${cron.uptimeMinutes % 60}m)` : ''}
                  </p>
                )}
              </div>
            </ScrollReveal>
          )}

          {/* Unhealthy jobs — full transparency when anything is off */}
          {!loading && !fetchFailed && unhealthyJobs.length > 0 && (
            <ScrollReveal>
              <div className="card p-6 border border-amber-500/20">
                <h2 className="text-lg font-semibold text-white mb-1">Jobs Needing Attention</h2>
                <p className="text-slate-500 text-xs mb-4">
                  These scheduled data jobs are stale or failing. We list them here in the interest of transparency.
                </p>
                <div className="space-y-2">
                  {unhealthyJobs.map((job) => (
                    <div key={job.label} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-white/[0.02]">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium">{job.label}</p>
                        <p className="text-slate-500 text-xs">
                          Schedule: {job.schedule}
                          {job.lastSuccessAt
                            ? ` · Last success: ${new Date(job.lastSuccessAt).toLocaleString()}`
                            : ' · No successful run recorded yet'}
                        </p>
                        {job.lastError && (
                          <p className="text-amber-400/80 text-xs mt-1 truncate">Last error: {job.lastError}</p>
                        )}
                      </div>
                      <StatusPill state="degraded" />
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Platform Stats */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Platform Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Pages & Tools', value: SITE_STATS.pagesAndTools },
                  { label: 'Data Sources', value: SITE_STATS.dataSources },
                  { label: 'Articles', value: SITE_STATS.articles },
                  { label: 'Automated Feeds', value: SITE_STATS.automatedFeeds },
                ].map((metric) => (
                  <div key={metric.label} className="text-center p-3 rounded-lg bg-white/[0.02]">
                    <p className="text-white text-lg font-bold">{metric.value}</p>
                    <p className="text-slate-500 text-xs">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Hosting note */}
          <ScrollReveal>
            <div className="text-center text-sm text-slate-500">
              <p>SpaceNexus is hosted on <strong className="text-slate-400">Railway</strong> with auto-deployment. Historical uptime tracking is coming as we scale.</p>
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
