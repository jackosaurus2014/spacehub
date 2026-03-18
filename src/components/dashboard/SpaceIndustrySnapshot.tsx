'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Pulse data types (mirrors /api/pulse response)                    */
/* ------------------------------------------------------------------ */

interface PulseData {
  latestNews: {
    title: string;
    source: string;
    url: string;
    publishedAt: string;
  } | null;
  nextLaunch: {
    name: string;
    date: string;
    agency: string | null;
    location: string | null;
    status: string | null;
  } | null;
  spaceWeather: {
    alertCount: number;
    severity: 'quiet' | 'minor' | 'moderate' | 'severe';
    summary: string;
  };
  activeSatellites: number;
  generatedAt: string;
}

export default function SpaceIndustrySnapshot() {
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function fetchPulse() {
      try {
        const res = await fetch('/api/pulse', { signal: controller.signal });
        if (!res.ok) throw new Error('Pulse fetch failed');
        const json = await res.json();
        if (json.success && json.data) {
          setPulse(json.data);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchPulse();
    return () => controller.abort();
  }, []);

  // Live countdown timer
  useEffect(() => {
    if (!pulse?.nextLaunch?.date) return;
    function tick() {
      const target = new Date(pulse!.nextLaunch!.date).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown('Launching now!');
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      if (d > 0) {
        setCountdown(`${d}d ${h}h ${m}m`);
      } else {
        setCountdown(`${h}h ${m}m ${s}s`);
      }
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pulse?.nextLaunch?.date]);

  const severityColor: Record<string, string> = {
    quiet: 'text-emerald-400',
    minor: 'text-yellow-400',
    moderate: 'text-orange-400',
    severe: 'text-red-400',
  };

  const severityBg: Record<string, string> = {
    quiet: 'bg-emerald-500/10',
    minor: 'bg-yellow-500/10',
    moderate: 'bg-orange-500/10',
    severe: 'bg-red-500/10',
  };

  if (loading) {
    return (
      <div className="card p-5 mb-8 animate-pulse">
        <div className="h-4 w-48 bg-white/[0.08] rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white/[0.06] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!pulse) return null;

  return (
    <div className="card p-5 mb-8 border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-indigo-500/[0.04]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          Space Industry Snapshot
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Latest Headline */}
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Latest Headline</span>
          </div>
          {pulse.latestNews ? (
            <Link href={pulse.latestNews.url || '/news'} className="block group">
              <p className="text-xs text-slate-300 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                {pulse.latestNews.title}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">{pulse.latestNews.source}</p>
            </Link>
          ) : (
            <p className="text-xs text-slate-500">No recent headlines</p>
          )}
        </div>

        {/* Next Launch */}
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Next Launch</span>
          </div>
          {pulse.nextLaunch ? (
            <Link href="/mission-control" className="block group">
              <p className="text-xs text-slate-300 group-hover:text-white transition-colors truncate">
                {pulse.nextLaunch.name}
              </p>
              <p className="text-sm font-bold text-emerald-400 mt-1 tabular-nums">{countdown}</p>
            </Link>
          ) : (
            <p className="text-xs text-slate-500">No upcoming launches</p>
          )}
        </div>

        {/* Space Weather */}
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Space Weather</span>
          </div>
          <Link href="/space-weather" className="block group">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${severityColor[pulse.spaceWeather.severity]} ${severityBg[pulse.spaceWeather.severity]}`}>
                {pulse.spaceWeather.severity}
              </span>
              {pulse.spaceWeather.alertCount > 0 && (
                <span className="text-[10px] text-slate-500">{pulse.spaceWeather.alertCount} alert{pulse.spaceWeather.alertCount > 1 ? 's' : ''}</span>
              )}
            </div>
            <p className="text-xs text-slate-400 group-hover:text-slate-300 mt-1.5 transition-colors line-clamp-1">
              {pulse.spaceWeather.summary}
            </p>
          </Link>
        </div>

        {/* Active Satellites */}
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Active Satellites</span>
          </div>
          <Link href="/satellites" className="block group">
            <p className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
              {pulse.activeSatellites.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">tracked in database</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
