'use client';

import { Webinar, WEBINAR_TOPICS } from '@/types';

interface WebinarCardProps {
  webinar: Webinar;
  compact?: boolean;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function WebinarCard({ webinar, compact = false }: WebinarCardProps) {
  const topicInfo = WEBINAR_TOPICS.find(t => t.value === webinar.topic);

  const getStatusBadge = () => {
    if (webinar.isLive) {
      return (
        <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded animate-pulse">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          LIVE NOW
        </span>
      );
    }
    if (webinar.isPast) {
      return (
        <span className="text-xs bg-slate-600/50 text-slate-400 px-2 py-0.5 rounded">
          Past Event
        </span>
      );
    }
    return (
      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
        Upcoming
      </span>
    );
  };

  if (compact) {
    return (
      <div className={`bg-slate-800/50 border rounded-lg p-4 transition-all ${
        webinar.isLive ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700/50 hover:border-cyan-500/50'
      }`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge()}
              {topicInfo && (
                <span className="text-xs text-slate-400">{topicInfo.icon} {topicInfo.label}</span>
              )}
            </div>
            <h4 className="font-semibold text-white text-sm line-clamp-2">{webinar.title}</h4>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{webinar.speaker}</span>
          <span>{formatDuration(webinar.duration)}</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-400">
            {webinar.isLive ? 'Happening now!' : formatDate(webinar.date)}
          </span>
          {webinar.isLive || webinar.registrationUrl ? (
            <a
              href={webinar.isLive ? '#' : webinar.registrationUrl || '#'}
              className="text-xs bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded transition-colors"
            >
              {webinar.isLive ? 'Join Now' : 'Register'}
            </a>
          ) : webinar.recordingUrl ? (
            <a
              href={webinar.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition-colors"
            >
              Watch Recording
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/50 border rounded-lg p-5 transition-all ${
      webinar.isLive ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700/50 hover:border-cyan-500/50'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {topicInfo && (
            <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">
              {topicInfo.icon} {topicInfo.label}
            </span>
          )}
        </div>
        <span className="text-slate-400 text-sm">{formatDuration(webinar.duration)}</span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-white text-lg mb-2">{webinar.title}</h3>

      {/* Description */}
      <p className="text-slate-400 text-sm mb-4 line-clamp-2">{webinar.description}</p>

      {/* Speaker */}
      <div className="bg-slate-700/30 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {webinar.speaker.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">{webinar.speaker}</p>
            <p className="text-slate-400 text-xs line-clamp-2">{webinar.speakerBio}</p>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{webinar.isLive ? 'Now' : formatDate(webinar.date)}</span>
        </div>
        {!webinar.isPast && !webinar.isLive && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatTime(webinar.date)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {webinar.isLive ? (
          <button className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Join Live Session
          </button>
        ) : webinar.registrationUrl ? (
          <a
            href={webinar.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors text-center"
          >
            Register for Webinar
          </a>
        ) : webinar.recordingUrl ? (
          <a
            href={webinar.recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors text-center"
          >
            Watch Recording
          </a>
        ) : (
          <span className="flex-1 text-center text-slate-400 text-sm py-2">
            Recording not available
          </span>
        )}
        <button className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
          Share
        </button>
      </div>
    </div>
  );
}
