'use client';

import { extractYouTubeId } from '@/components/live/MissionStream';

interface VideoStreamProps {
  streamUrl: string | null | undefined;
  eventName: string;
}

export default function VideoStream({ streamUrl, eventName }: VideoStreamProps) {
  const videoId = extractYouTubeId(streamUrl);

  return (
    <div className="relative w-full">
      <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50">
        {videoId ? (
          <>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
              title={`${eventName} - Live Stream`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
            {/* Go Live badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 text-white text-sm font-bold shadow-lg shadow-red-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              LIVE
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              {/* Star field */}
              {Array.from({ length: 15 }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
                  style={{
                    top: `${(i * 37) % 100}%`,
                    left: `${(i * 53) % 100}%`,
                    animationDelay: `${(i * 0.3) % 3}s`,
                    animationDuration: `${2 + (i % 3)}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Waiting for Stream...</h3>
              <p className="text-slate-400 text-sm max-w-sm">
                The live stream for <span className="text-cyan-400">{eventName}</span> will appear here when available.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
