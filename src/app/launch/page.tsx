'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import PageHeader from '@/components/ui/PageHeader';

interface LaunchEvent {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  launchDate: string | null;
  location: string | null;
  country: string | null;
  agency: string | null;
  rocket: string | null;
  mission: string | null;
  imageUrl: string | null;
  infoUrl: string | null;
  streamUrl: string | null;
  isLive: boolean;
}

function CountdownTimer({ launchDate }: { launchDate: string }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const target = new Date(launchDate);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        const elapsed = Math.abs(diff);
        const h = Math.floor(elapsed / 3600000);
        const m = Math.floor((elapsed % 3600000) / 60000);
        const s = Math.floor((elapsed % 60000) / 1000);
        setCountdown(`T+${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`T-${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [launchDate]);

  return <span className="font-mono text-sm font-bold">{countdown}</span>;
}

function LaunchCard({ event, variant }: { event: LaunchEvent; variant: 'live' | 'upcoming' | 'recent' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative overflow-hidden rounded-xl border transition-all hover:shadow-lg ${
        variant === 'live'
          ? 'border-red-500/50 bg-slate-900 hover:shadow-red-500/10'
          : variant === 'upcoming'
          ? 'border-cyan-500/30 bg-slate-900 hover:shadow-cyan-500/10'
          : 'border-slate-700/50 bg-slate-900/80 hover:shadow-slate-500/5'
      }`}
    >
      {/* Glow for live */}
      {variant === 'live' && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-xl opacity-30 blur animate-pulse" />
      )}

      <div className="relative flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative w-full sm:w-36 h-32 sm:h-auto flex-shrink-0 bg-slate-800">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
              <span className="text-4xl">🚀</span>
            </div>
          )}

          {/* Status badge */}
          {variant === 'live' && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              LIVE
            </div>
          )}
          {variant === 'upcoming' && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">
              UPCOMING
            </div>
          )}
          {variant === 'recent' && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
              COMPLETED
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <h3 className="text-white font-bold text-lg line-clamp-2 group-hover:text-cyan-400 transition-colors">
            {event.name}
          </h3>
          {event.agency && (
            <p className="text-slate-400 text-sm mt-1">{event.agency}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
            {event.rocket && (
              <span className="flex items-center gap-1 text-cyan-400">
                🚀 {event.rocket}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                📍 {event.location}
              </span>
            )}
          </div>

          {/* Countdown + Action */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
            {event.launchDate && (
              <div className={variant === 'live' ? 'text-red-400' : variant === 'upcoming' ? 'text-cyan-400' : 'text-slate-400'}>
                <CountdownTimer launchDate={event.launchDate} />
              </div>
            )}

            <Link
              href={`/launch/${event.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                variant === 'live'
                  ? 'bg-red-500 text-white hover:bg-red-400'
                  : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
              }`}
            >
              {variant === 'live' ? 'Watch Live' : 'View Details'}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LaunchListPage() {
  const [data, setData] = useState<{
    live: LaunchEvent[];
    imminent: LaunchEvent[];
    recent: LaunchEvent[];
    upcoming: LaunchEvent[];
  }>({ live: [], imminent: [], recent: [], upcoming: [] });
  const [loading, setLoading] = useState(true);

  const fetchLaunches = useCallback(async () => {
    try {
      const res = await fetch('/api/launch-day/active');
      if (!res.ok) return;
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLaunches();
    const interval = setInterval(fetchLaunches, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchLaunches]);

  const allUpcoming = [...data.imminent, ...data.upcoming];
  const hasAny = data.live.length > 0 || allUpcoming.length > 0 || data.recent.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Launch Day"
          subtitle="Real-time launch coverage with live telemetry, mission timelines, and community chat"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Mission Control', href: '/mission-control' },
            { label: 'Launch Day' },
          ]}
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <div
              className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"
              style={{ borderWidth: '3px' }}
            />
          </div>
        ) : !hasAny ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-6 border border-slate-700/50">
              <span className="text-5xl">🚀</span>
            </div>
            <h2 className="text-white text-2xl font-bold mb-3">No Active Launches</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-6">
              There are currently no live or upcoming launches. Check back soon or visit Mission Control for the full launch schedule.
            </p>
            <Link
              href="/mission-control"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              View Mission Control
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Live Launches */}
            {data.live.length > 0 && (
              <section>
                <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  Live Now
                </h2>
                <div className="space-y-4">
                  {data.live.map(event => (
                    <LaunchCard key={event.id} event={event} variant="live" />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Launches */}
            {allUpcoming.length > 0 && (
              <section>
                <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">⏰</span>
                  Upcoming Launches
                </h2>
                <div className="space-y-4">
                  {allUpcoming.map(event => (
                    <LaunchCard key={event.id} event={event} variant="upcoming" />
                  ))}
                </div>
              </section>
            )}

            {/* Recent Launches */}
            {data.recent.length > 0 && (
              <section>
                <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  Recently Completed
                </h2>
                <div className="space-y-4">
                  {data.recent.map(event => (
                    <LaunchCard key={event.id} event={event} variant="recent" />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
