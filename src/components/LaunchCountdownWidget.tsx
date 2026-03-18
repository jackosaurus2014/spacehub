'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LaunchStream {
  id: string;
  title: string;
  provider: string;
  scheduledTime: string;
  description: string;
  isLive: boolean;
}

interface LiveAPIResponse {
  streams: LaunchStream[];
  nextStream: LaunchStream | null;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function getCountdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, passed: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs, passed: false };
}

function WidgetSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-white/[0.08] rounded w-32" />
        <div className="h-3 bg-white/[0.06] rounded w-20" />
      </div>
      <div className="h-5 bg-white/[0.08] rounded w-3/4 mb-3" />
      <div className="flex gap-3 mb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <div className="h-7 w-9 bg-white/[0.08] rounded mb-1" />
            <div className="h-2 w-6 bg-white/[0.06] rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="h-3 bg-white/[0.06] rounded w-1/2" />
    </div>
  );
}

export default function LaunchCountdownWidget() {
  const [launch, setLaunch] = useState<LaunchStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/live', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then((data: LiveAPIResponse) => {
        // Use the next upcoming stream
        if (data.nextStream) {
          setLaunch(data.nextStream);
        } else if (data.streams.length > 0) {
          // Fallback: first stream that hasn't passed
          const upcoming = data.streams.find(
            (s) => new Date(s.scheduledTime).getTime() > Date.now()
          );
          setLaunch(upcoming || data.streams[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  // Tick every second for live countdown
  useEffect(() => {
    if (!launch) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [launch]);

  if (loading) return <WidgetSkeleton />;

  if (error || !launch) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">&#x1F680;</span>
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Next Launch
          </h3>
        </div>
        <p className="text-sm text-slate-400">
          No upcoming launch data available.
        </p>
        <Link
          href="/mission-control"
          className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors mt-2"
        >
          View all launches
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
    );
  }

  const cd = getCountdown(launch.scheduledTime);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
          <span className="text-lg">&#x1F680;</span>
          Next Launch
        </h3>
        {launch.isLive && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
            </span>
            Live
          </span>
        )}
      </div>

      {/* Mission name */}
      <p className="text-white font-semibold text-sm truncate mb-1">
        {launch.title}
      </p>
      <p className="text-[11px] text-slate-500 mb-3">
        {launch.provider}
      </p>

      {/* Countdown */}
      {!cd.passed ? (
        <div className="flex gap-2 mb-3" aria-label={`${cd.days} days ${cd.hours} hours ${cd.mins} minutes ${cd.secs} seconds`}>
          {[
            { val: cd.days, label: 'DAYS' },
            { val: cd.hours, label: 'HRS' },
            { val: cd.mins, label: 'MIN' },
            { val: cd.secs, label: 'SEC' },
          ].map((u) => (
            <div
              key={u.label}
              className="flex-1 text-center py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]"
            >
              <span className="block text-lg font-bold font-mono bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent leading-none">
                {pad(u.val)}
              </span>
              <span className="text-[9px] text-slate-500 tracking-wider uppercase mt-0.5 block">
                {u.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-3 py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-xs text-emerald-400 font-medium">Launch window active</span>
        </div>
      )}

      {/* Launch date */}
      <p className="text-[11px] text-slate-500 mb-3">
        {new Date(launch.scheduledTime).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        })}
      </p>

      {/* View all link */}
      <Link
        href="/mission-control"
        className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors font-medium"
      >
        View all launches
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>
    </div>
  );
}
