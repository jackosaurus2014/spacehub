'use client';

import { useState, useEffect } from 'react';

interface StreamEmbedProps {
  youtubeVideoId: string | null;
  isLive: boolean;
  scheduledTime: string;
  title: string;
  provider: string;
}

export default function StreamEmbed({
  youtubeVideoId,
  isLive,
  scheduledTime,
  title,
  provider,
}: StreamEmbedProps) {
  const [countdown, setCountdown] = useState<string>('');
  const [timeUntilStream, setTimeUntilStream] = useState<number>(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const scheduledMs = new Date(scheduledTime).getTime();
      const diff = scheduledMs - now;

      setTimeUntilStream(diff);

      if (diff <= 0) {
        setCountdown('Stream starting...');
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
      } else {
        setCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scheduledTime]);

  // If live and has video ID, show the embed
  if (isLive && youtubeVideoId) {
    return (
      <div className="relative w-full aspect-video bg-space-900 rounded-xl overflow-hidden border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 text-white text-sm font-bold animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full" />
            LIVE
          </span>
          <span className="px-3 py-1.5 rounded-full bg-space-800/90 text-white text-sm font-medium backdrop-blur-sm">
            {provider}
          </span>
        </div>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  // Placeholder when no stream is live
  return (
    <div className="relative w-full aspect-video bg-gradient-to-br from-space-900 via-space-800 to-space-900 rounded-xl overflow-hidden border border-slate-700/50">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        {/* Star field effect */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-twinkle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
        {/* Rocket icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-cyan-500/30">
            <svg
              className="w-12 h-12 text-cyan-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
              />
            </svg>
          </div>
          {timeUntilStream > 0 && timeUntilStream < 60 * 60 * 1000 && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full animate-ping" />
          )}
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-cyan-400 font-medium mb-4">{provider}</p>

        {/* Countdown */}
        <div className="flex flex-col items-center">
          <p className="text-slate-400 text-sm mb-2">Stream starts in</p>
          <div className="text-3xl md:text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
            {countdown}
          </div>
        </div>

        {/* Scheduled time */}
        <p className="text-slate-500 text-sm mt-4">
          {new Date(scheduledTime).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          })}
        </p>

        {/* Notification hint */}
        {timeUntilStream > 60 * 60 * 1000 && (
          <div className="mt-6 flex items-center gap-2 text-slate-500 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            Bookmark this page to watch live
          </div>
        )}
      </div>
    </div>
  );
}
