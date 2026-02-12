'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import StreamEmbed from '@/components/live/StreamEmbed';
import TelemetryPanel from '@/components/live/TelemetryPanel';
import LiveChat from '@/components/live/LiveChat';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';

interface LiveStream {
  id: string;
  title: string;
  provider: string;
  launchName: string;
  scheduledTime: string;
  youtubeVideoId: string | null;
  isLive: boolean;
  description: string;
  rocket: string;
  mission: string;
  launchSite: string;
}

interface StreamsData {
  streams: LiveStream[];
  nextStream: LiveStream | null;
  liveNow: LiveStream[];
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
        console.error('Failed to fetch live streams:', error);
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
        <PageHeader
          title="Live Launch Hub"
          subtitle="Watch rocket launches live with real-time telemetry and community chat"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Live' }]}
        />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Main Content Grid */}
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
                    <span className="px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-medium border border-cyan-500/30">
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
                  <div className="text-2xl sm:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                    {countdown}
                  </div>
                </div>
              </div>
            )}

            {/* Video Embed */}
            {selectedStream ? (
              <StreamEmbed
                youtubeVideoId={selectedStream.youtubeVideoId}
                isLive={selectedStream.isLive}
                scheduledTime={selectedStream.scheduledTime}
                title={selectedStream.title}
                provider={selectedStream.provider}
              />
            ) : (
              <div className="aspect-video bg-space-900 rounded-xl flex items-center justify-center border border-slate-700/50">
                <div className="text-center">
                  <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-400">No streams scheduled</p>
                </div>
              </div>
            )}

            {/* Mission Details */}
            {selectedStream && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <p className="text-slate-300 mt-4 text-sm leading-relaxed">
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

        {/* Upcoming Launches Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upcoming Launch Streams
            </h2>
            <Link
              href="/mission-control"
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors flex items-center gap-1"
            >
              View All Missions
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {upcomingStreams.length === 0 ? (
            <div className="card p-8 text-center">
              <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-400">No upcoming streams scheduled</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingStreams.map((stream) => (
                <button
                  key={stream.id}
                  onClick={() => setSelectedStream(stream)}
                  className={`card p-4 text-left transition-all hover:border-cyan-500/50 ${
                    selectedStream?.id === stream.id
                      ? 'border-cyan-500/50 bg-cyan-500/5'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-medium">
                      {stream.provider}
                    </span>
                    {selectedStream?.id === stream.id && (
                      <span className="text-cyan-400 text-xs font-medium">Selected</span>
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
          )}
        </div>

        {/* Related Links */}
        <div className="card p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Related Resources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/mission-control"
              className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-cyan-300">Mission Control</div>
              <p className="text-xs text-slate-400 mt-1">All upcoming launches</p>
            </Link>
            <Link
              href="/solar-flares"
              className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-cyan-300">Solar Activity</div>
              <p className="text-xs text-slate-400 mt-1">Space weather impacts</p>
            </Link>
            <Link
              href="/debris-monitor"
              className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-cyan-300">Debris Monitor</div>
              <p className="text-xs text-slate-400 mt-1">Orbital safety tracking</p>
            </Link>
            <Link
              href="/news"
              className="p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-cyan-300">Space News</div>
              <p className="text-xs text-slate-400 mt-1">Latest industry updates</p>
            </Link>
          </div>
        </div>
      </div>
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
