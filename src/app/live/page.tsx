'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import StreamEmbed from '@/components/live/StreamEmbed';
import TelemetryPanel from '@/components/live/TelemetryPanel';
import LiveChat from '@/components/live/LiveChat';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { clientLogger } from '@/lib/client-logger';
import LiveBlog from '@/components/live/LiveBlog';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

interface LiveStream {
  id: string;
  title: string;
  provider: string;
  launchName: string;
  scheduledTime: string;
  youtubeVideoId: string | null;
  watchUrl: string | null;
  youtubeWatchUrl: string | null;
  isLive: boolean;
  description: string;
  rocket: string;
  mission: string;
  launchSite: string;
}

/** Extract YouTube video ID from various URL formats */
function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/** NASA's official YouTube channel ID for fallback live embed */
const NASA_LIVE_CHANNEL_ID = 'UCLA_DiR1FfKNvjuUpBHmylQ';

interface StreamsData {
  streams: LiveStream[];
  nextStream: LiveStream | null;
  liveNow: LiveStream[];
}

// Static upcoming launches data for when no live streams are available
const UPCOMING_LAUNCHES = [
  {
    id: 'starship-flight-12',
    mission: 'Starship Flight 12',
    provider: 'SpaceX',
    date: '2026-04-01T00:00:00Z',
    description: 'First flight of the Starship V3 configuration with Raptor V3 engines. Full-stack booster catch attempt and upper stage reentry.',
  },
  {
    id: 'kuiper-protoflight-2',
    mission: 'Kuiper Protoflight 2',
    provider: 'Amazon / ULA Vulcan',
    date: '2026-04-10T00:00:00Z',
    description: 'Second prototype batch of Amazon Project Kuiper broadband satellites, launching on ULA Vulcan Centaur.',
  },
  {
    id: 'dream-chaser-2',
    mission: 'Dream Chaser CRS-2',
    provider: 'Sierra Space / Vulcan',
    date: '2026-05-15T00:00:00Z',
    description: 'Sierra Space Dream Chaser second cargo resupply mission to the International Space Station.',
  },
  {
    id: 'new-glenn-3',
    mission: 'New Glenn Flight 3',
    provider: 'Blue Origin',
    date: '2026-05-20T00:00:00Z',
    description: 'Blue Origin New Glenn third flight carrying customer payloads to orbit with first stage landing attempt.',
  },
];

function useCountdownTimer(targetDate: string) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const diff = new Date(targetDate).getTime() - now;
      if (diff <= 0) {
        setDisplay('Imminent');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      if (days > 0) setDisplay(`${days}d ${hours}h ${minutes}m`);
      else if (hours > 0) setDisplay(`${hours}h ${minutes}m ${seconds}s`);
      else setDisplay(`${minutes}m ${seconds}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return display;
}

function UpcomingLaunchCard({ launch }: { launch: typeof UPCOMING_LAUNCHES[number] }) {
  const countdown = useCountdownTimer(launch.date);
  const launchDate = new Date(launch.date);

  return (
    <div className="card p-5 hover:border-white/15 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <span className="px-2.5 py-1 rounded-full bg-white/[0.06] text-white/70 text-xs font-medium border border-white/[0.06]">
          {launch.provider}
        </span>
        <Link
          href="/alerts"
          className="text-xs text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Set Reminder
        </Link>
      </div>
      <h3 className="text-white font-semibold text-lg mb-1">{launch.mission}</h3>
      <p className="text-slate-400 text-sm mb-4 line-clamp-2">{launch.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {launchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
          T-{countdown}
        </div>
      </div>
      {(launch as any).blogSlug && (
        <Link
          href={`/blog/${(launch as any).blogSlug}`}
          className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
        >
          Read mission guide
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function LiveHubContent() {
  const [data, setData] = useState<StreamsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch streams data
  useEffect(() => {
    const fetchStreams = async () => {
      setError(null);
      try {
        const res = await fetch('/api/live');
        const result = await res.json();
        setData(result);
        // Auto-select the next stream or first live stream
        if (result.liveNow?.length > 0) {
          setSelectedStream(result.liveNow[0]);
        } else if (result.nextStream) {
          setSelectedStream(result.nextStream);
        }
      } catch (error) {
        clientLogger.error('Failed to fetch live streams', { error: error instanceof Error ? error.message : String(error) });
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
    // Refresh every minute
    const interval = setInterval(fetchStreams, 60000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for next launch
  useEffect(() => {
    if (!selectedStream) return;

    const updateCountdown = () => {
      const now = Date.now();
      const scheduledMs = new Date(selectedStream.scheduledTime).getTime();
      const diff = scheduledMs - now;

      if (diff <= 0) {
        setCountdown('LIVE NOW');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [selectedStream]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const streams = data?.streams || [];
  const upcomingStreams = streams.filter((s) => !s.isLive).slice(0, 5);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Live Launch Hub"
          subtitle="Watch rocket launches live with real-time telemetry and community chat"
          icon="📡"
          accentColor="cyan"
        />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Main Content Grid */}
        <ScrollReveal>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
          {/* Stream Embed - Main Column */}
          <div className="xl:col-span-8 space-y-6">
            {/* Live Countdown Banner */}
            {selectedStream && (
              <div className="card-elevated p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {selectedStream.isLive ? (
                    <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 text-sm font-bold animate-pulse border border-red-500/30">
                      <span className="w-2 h-2 bg-red-400 rounded-full" />
                      LIVE NOW
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-sm font-medium border border-white/10">
                      Next Launch
                    </span>
                  )}
                  <div>
                    <h2 className="text-white font-semibold">{selectedStream.launchName}</h2>
                    <p className="text-slate-400 text-sm">{selectedStream.provider}</p>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">
                    {selectedStream.isLive ? 'Stream Active' : 'T-Minus'}
                  </div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-300 via-purple-400 to-pink-400">
                    {countdown}
                  </div>
                </div>
              </div>
            )}

            {/* Video Embed */}
            {selectedStream ? (
              <StreamEmbed
                youtubeVideoId={extractYouTubeId(selectedStream.watchUrl || selectedStream.youtubeWatchUrl || selectedStream.youtubeVideoId)}
                isLive={selectedStream.isLive}
                scheduledTime={selectedStream.scheduledTime}
                title={selectedStream.title}
                provider={selectedStream.provider}
              />
            ) : (
              <div className="aspect-video bg-space-900 rounded-xl flex items-center justify-center border border-white/[0.06] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
                <div className="text-center relative z-10 px-6">
                  <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-white font-semibold text-lg mb-2">No Active Streams Right Now</p>
                  <p className="text-slate-400 text-sm mb-4 max-w-sm mx-auto">
                    Check out the upcoming launches below, or set up alerts so you never miss a live stream.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Link
                      href="/alerts"
                      className="px-4 py-2 text-sm font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors border border-white/[0.08]"
                    >
                      Set Up Alerts
                    </Link>
                    <Link
                      href="/ignition"
                      className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-white rounded-lg transition-colors border border-white/[0.08]"
                    >
                      Moon Base Tracker
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Mission Details */}
            {selectedStream && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mission Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Rocket</div>
                    <div className="text-white font-medium">{selectedStream.rocket}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Mission</div>
                    <div className="text-white font-medium">{selectedStream.mission}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Launch Site</div>
                    <div className="text-white font-medium">{selectedStream.launchSite}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Provider</div>
                    <div className="text-white font-medium">{selectedStream.provider}</div>
                  </div>
                </div>
                <p className="text-white/70 mt-4 text-sm leading-relaxed">
                  {selectedStream.description}
                </p>
              </div>
            )}
          </div>

          {/* Side Column - Telemetry & Chat */}
          <div className="xl:col-span-4 space-y-6">
            {/* Telemetry Panel */}
            <TelemetryPanel
              isLive={selectedStream?.isLive || false}
              scheduledTime={selectedStream?.scheduledTime || new Date().toISOString()}
            />

            {/* Live Chat */}
            <div className="relative">
              <LiveChat />
            </div>
          </div>
        </div>

        </ScrollReveal>

        {/* Upcoming Launch Streams (from API) */}
        {upcomingStreams.length > 0 && (
          <ScrollReveal delay={0.1}>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upcoming Launch Streams
              </h2>
              <Link
                href="/mission-control"
                className="text-white/70 hover:text-white text-sm font-medium transition-colors flex items-center gap-1"
              >
                View All Missions
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingStreams.map((stream) => (
                <button
                  key={stream.id}
                  onClick={() => setSelectedStream(stream)}
                  className={`card p-4 text-left transition-all hover:border-white/15 ${
                    selectedStream?.id === stream.id
                      ? 'border-white/15 bg-white/5'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2 py-1 rounded bg-white/[0.06] text-white/70 text-xs font-medium">
                      {stream.provider}
                    </span>
                    {selectedStream?.id === stream.id && (
                      <span className="text-white/70 text-xs font-medium">Selected</span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold mb-1 line-clamp-1">{stream.launchName}</h3>
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{stream.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(stream.scheduledTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {stream.launchSite}
                  </div>
                </button>
              ))}
            </div>
          </div>
          </ScrollReveal>
        )}

        {/* Upcoming Launches Section - always visible, especially valuable when no streams are active */}
        <ScrollReveal delay={0.1}>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-cyan-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Upcoming Launches
            </h2>
            <Link
              href="/alerts"
              className="text-cyan-400/70 hover:text-cyan-400 text-sm font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Get Launch Alerts
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {UPCOMING_LAUNCHES.map((launch) => (
              <UpcomingLaunchCard key={launch.id} launch={launch} />
            ))}
          </div>
        </div>
        </ScrollReveal>

        {/* Moon Base Tracker Banner */}
        <ScrollReveal delay={0.15}>
        <div className="mb-8 card-elevated p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 border border-white/[0.08]">
                <span className="text-2xl">🌙</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">NASA Moon Base & Artemis Program</h3>
                <p className="text-slate-400 text-sm mt-0.5">Artemis II complete. Next up: Starship HLS demo, Gateway launch, and Artemis III crew landing.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/ignition" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-white rounded-lg transition-colors border border-white/[0.08]">
                Ignition Tracker
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/cislunar" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors border border-white/[0.06]">
                Cislunar Ecosystem
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </div>
        </ScrollReveal>

        {/* Related Links */}
        <ScrollReveal delay={0.2}>
        <div className="card p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Related Resources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/mission-control"
              className="p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-white">Mission Control</div>
              <p className="text-xs text-slate-400 mt-1">All upcoming launches</p>
            </Link>
            <Link
              href="/space-environment?tab=weather"
              className="p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-white">Solar Activity</div>
              <p className="text-xs text-slate-400 mt-1">Space weather impacts</p>
            </Link>
            <Link
              href="/space-environment?tab=debris"
              className="p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-white">Debris Monitor</div>
              <p className="text-xs text-slate-400 mt-1">Orbital safety tracking</p>
            </Link>
            <Link
              href="/news"
              className="p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-white">Space News</div>
              <p className="text-xs text-slate-400 mt-1">Latest industry updates</p>
            </Link>
          </div>
        </div>
        </ScrollReveal>

        {/* Launch Notification Signup */}
        <ScrollReveal delay={0.3}>
          <LaunchNotificationSignup />
        </ScrollReveal>
      </div>
    </div>
  );
}

function LaunchNotificationSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'live_page' }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Check your email to confirm!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(
          data.code === 'ALREADY_SUBSCRIBED'
            ? 'You\'re already subscribed!'
            : data.error || 'Failed to subscribe. Please try again.'
        );
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="card p-6 mb-8 text-center">
      <h3 className="text-lg font-semibold text-white mb-1 flex items-center justify-center gap-2">
        <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Get notified when launches go live
      </h3>
      <p className="text-slate-400 text-sm mb-4">
        Never miss a launch. We&apos;ll email you before streams start.
      </p>

      {status === 'success' ? (
        <p className="text-emerald-400 text-sm font-medium">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="send"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            aria-label="Email address"
            className="flex-1 px-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20 transition-colors"
            required
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email}
            className="px-5 py-2.5 text-sm font-semibold bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p className="mt-3 text-red-400 text-sm">{message}</p>
      )}
    </div>
  );
}

export default function LiveLaunchHub() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <LiveHubContent />
    </Suspense>
  );
}
