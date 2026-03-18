'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Matches the ActiveLiveStream shape from /api/livestreams */
interface ActiveLiveStream {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  thumbnailUrl: string;
  viewerCount: number;
  startedAt: string;
  embedUrl: string;
  platform?: 'youtube' | 'x';
  watchUrl?: string;
}

interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CHAT_STORAGE_PREFIX = 'spacenexus-livestream-chat-';
const USERNAME_KEY = 'spacenexus-chat-username';
const MAX_MESSAGES = 50;

const SIMULATED_MESSAGES: ChatMessage[] = [
  {
    id: 'sim-1',
    username: 'SpaceWatcher',
    text: 'This is amazing!',
    timestamp: Date.now() - 120000,
  },
  {
    id: 'sim-2',
    username: 'OrbitFan',
    text: 'Great coverage on this stream',
    timestamp: Date.now() - 90000,
  },
  {
    id: 'sim-3',
    username: 'LaunchTracker',
    text: 'Go for launch!',
    timestamp: Date.now() - 60000,
  },
];

/* ------------------------------------------------------------------ */
/*  Helper: Format viewer count                                        */
/* ------------------------------------------------------------------ */

function formatViewerCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/* ------------------------------------------------------------------ */
/*  Helper: Format timestamp                                           */
/* ------------------------------------------------------------------ */

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-component: Stream Selector Bar                                 */
/* ------------------------------------------------------------------ */

function StreamSelector({
  streams,
  selectedVideoId,
  onSelect,
}: {
  streams: ActiveLiveStream[];
  selectedVideoId: string;
  onSelect: (stream: ActiveLiveStream) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {streams.map((stream) => (
        <button
          key={stream.videoId}
          onClick={() => onSelect(stream)}
          className={`flex-shrink-0 flex items-center gap-3 p-2 pr-4 rounded-xl border transition-all duration-200 ${
            stream.videoId === selectedVideoId
              ? 'border-red-500/50 bg-red-500/10'
              : 'border-white/[0.06] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]'
          }`}
        >
          {/* Thumbnail */}
          <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-space-800 flex-shrink-0">
            {stream.thumbnailUrl ? (
              <img
                src={stream.thumbnailUrl}
                alt={stream.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            {/* LIVE badge */}
            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-red-500 text-[10px] font-bold text-white leading-none">
              LIVE
            </span>
          </div>

          {/* Info */}
          <div className="text-left min-w-0">
            <div className="text-xs font-medium text-white truncate max-w-[140px] flex items-center gap-1.5">
              {stream.channelName}
              {/* Platform badge */}
              {stream.platform === 'x' ? (
                <svg className="w-3 h-3 text-white/60 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-red-400/60 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                </svg>
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              {stream.platform === 'x' ? (
                <span>on X</span>
              ) : (
                <>
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {formatViewerCount(stream.viewerCount)}
                </>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-component: Live Chat                                           */
/* ------------------------------------------------------------------ */

function LiveDiscussion({ videoId }: { videoId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const storageKey = `${CHAT_STORAGE_PREFIX}${videoId}`;

  // Load username from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(USERNAME_KEY);
    if (saved) setUsername(saved);
  }, []);

  // Load messages for this videoId from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatMessage[];
        setMessages(parsed.slice(-MAX_MESSAGES));
        return;
      } catch {
        // ignore
      }
    }
    // No stored messages -- seed with simulated ones
    setMessages(SIMULATED_MESSAGES);
  }, [storageKey]);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        storageKey,
        JSON.stringify(messages.slice(-MAX_MESSAGES))
      );
    }
  }, [messages, storageKey]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    const sanitized = usernameInput.trim().slice(0, 20);
    setUsername(sanitized);
    localStorage.setItem(USERNAME_KEY, sanitized);
    setShowUsernamePrompt(false);
    setUsernameInput('');
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (!username) {
      setShowUsernamePrompt(true);
      return;
    }

    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      username,
      text: newMessage.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, msg].slice(-MAX_MESSAGES));
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-space-900/95 via-space-800/95 to-space-900/95 rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] bg-space-800/50 flex items-center justify-between flex-shrink-0">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <svg
            className="w-4 h-4 text-white/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Live Discussion
        </h3>
        {username && (
          <button
            onClick={() => {
              setUsernameInput(username);
              setShowUsernamePrompt(true);
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors truncate max-w-[100px]"
          >
            {username}
          </button>
        )}
      </div>

      {/* Username Prompt */}
      {showUsernamePrompt && (
        <div className="p-4 border-b border-white/[0.06] bg-space-800/70">
          <form onSubmit={handleSaveUsername} className="flex gap-2">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Enter username"
              maxLength={20}
              autoFocus
              className="flex-1 px-3 py-1.5 rounded-lg bg-space-900 border border-white/[0.08] text-white text-sm placeholder-slate-400 focus:outline-none focus:border-white/15"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUsernamePrompt(false);
                setUsernameInput('');
              }}
              className="px-3 py-1.5 rounded-lg bg-white/[0.08] text-white/70 text-sm hover:bg-white/[0.1] transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: '300px' }}>
        {messages.map((msg) => (
          <div key={msg.id} className="group">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-purple-400 flex-shrink-0">
                {msg.username}
              </span>
              <span className="text-[11px] text-slate-500 flex-shrink-0">
                {formatTimestamp(msg.timestamp)}
              </span>
            </div>
            <p className="text-sm text-white/80 mt-0.5 break-words">
              {msg.text}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-white/[0.06] bg-space-800/30 flex-shrink-0"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={username ? 'Type a message...' : 'Set username to chat'}
            maxLength={500}
            className="flex-1 px-3 py-2 rounded-lg bg-space-900 border border-white/[0.08] text-white text-sm placeholder-slate-400 focus:outline-none focus:border-white/15"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-3 py-2 rounded-lg bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        {!username && (
          <button
            type="button"
            onClick={() => setShowUsernamePrompt(true)}
            className="mt-2 text-xs text-white/60 hover:text-white transition-colors"
          >
            Click here to set your username
          </button>
        )}
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component: LiveStreamSection                                  */
/* ------------------------------------------------------------------ */

interface NextLaunch {
  title: string;
  provider: string;
  scheduledTime: string;
}

export default function LiveStreamSection() {
  const [streams, setStreams] = useState<ActiveLiveStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<ActiveLiveStream | null>(
    null
  );
  const [nextLaunch, setNextLaunch] = useState<NextLaunch | null>(null);
  const [countdown, setCountdown] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Fetch active livestreams on mount and poll every 60s
  useEffect(() => {
    let isMounted = true;

    const fetchStreams = async () => {
      try {
        // Fetch active streams and next launch in parallel
        const [streamsRes, liveRes] = await Promise.all([
          fetch('/api/livestreams').catch(() => null),
          fetch('/api/live').catch(() => null),
        ]);

        if (!isMounted) return;

        // Process active streams
        if (streamsRes?.ok) {
          const data = await streamsRes.json();
          const active: ActiveLiveStream[] = data.streams || [];
          setStreams(active);

          if (active.length > 0) {
            setSelectedStream((prev) => {
              if (prev && active.find((s) => s.videoId === prev.videoId)) {
                return prev;
              }
              return active[0];
            });
          } else {
            setSelectedStream(null);
          }
        }

        // Process next launch (for countdown when no active streams)
        if (liveRes?.ok) {
          const liveData = await liveRes.json();
          if (liveData.nextStream) {
            setNextLaunch({
              title: liveData.nextStream.title || 'Upcoming Launch',
              provider: liveData.nextStream.provider || '',
              scheduledTime: liveData.nextStream.scheduledTime,
            });
          }
        }
      } catch {
        // Silently fail
      } finally {
        if (isMounted) setLoaded(true);
      }
    };

    fetchStreams();
    const interval = setInterval(fetchStreams, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Countdown timer for next launch
  useEffect(() => {
    if (!nextLaunch?.scheduledTime || streams.length > 0) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(nextLaunch.scheduledTime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown('Starting soon...');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);
      setCountdown(parts.join(' '));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [nextLaunch, streams.length]);

  // Still loading
  if (!loaded) return null;

  // ---- No active streams: show countdown card ----
  if (streams.length === 0) {
    return (
      <section className="relative z-10 py-6">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-slate-900/80 via-space-900/60 to-indigo-950/40 backdrop-blur-sm">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.05] rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/[0.05] rounded-full blur-3xl" />

            <div className="relative p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Left: Icon + Status */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                      <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    {/* Offline indicator */}
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-600 rounded-full border-2 border-slate-900" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                      No Active Livestream
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      We monitor SpaceX, NASA, Blue Origin & more
                    </p>
                  </div>
                </div>

                {/* Center: Next launch info + countdown */}
                {nextLaunch && countdown ? (
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-sm text-slate-400 mb-1">
                      Next livestream expected
                    </p>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 line-clamp-1">
                      {nextLaunch.title}
                      {nextLaunch.provider && (
                        <span className="text-sm font-normal text-slate-400 ml-2">
                          — {nextLaunch.provider}
                        </span>
                      )}
                    </h3>
                    {/* Countdown digits */}
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      {countdown.split(' ').map((part, i) => {
                        const num = part.slice(0, -1);
                        const unit = part.slice(-1);
                        return (
                          <div key={i} className="flex items-baseline gap-0.5">
                            <span className="text-2xl md:text-3xl font-mono font-bold text-white tabular-nums">
                              {num}
                            </span>
                            <span className="text-sm text-slate-500 font-medium">
                              {unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-sm text-slate-400">
                      No upcoming launches scheduled — check back soon
                    </p>
                  </div>
                )}

                {/* Right: CTA */}
                <div className="flex-shrink-0 flex flex-col gap-2">
                  <a
                    href="/live"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white hover:bg-white/[0.1] hover:border-white/15 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    View Launch Schedule
                  </a>
                  <a
                    href="/mission-control"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Mission Control →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ---- Active streams: show full live experience ----
  const currentStream = selectedStream || streams[0];
  const hasMultipleStreams = streams.length > 1;

  return (
    <section className="relative z-10 py-6">
      <div className="container mx-auto px-4">
        {/* LIVE NOW header with pulsing red dot */}
        <div className="flex items-center gap-3 mb-5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <h2 className="text-xl md:text-2xl font-display font-bold text-white uppercase tracking-wider">
            Live Now
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-red-500/40 to-transparent" />
        </div>

        {/* Stream Selector (multiple streams) */}
        {hasMultipleStreams && (
          <div className="mb-4">
            <StreamSelector
              streams={streams}
              selectedVideoId={currentStream.videoId}
              onSelect={setSelectedStream}
            />
          </div>
        )}

        {/* Main content: Video + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Video Column (2/3 on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stream embed — YouTube or X */}
            <div className="relative w-full bg-space-900 rounded-xl overflow-hidden border border-white/[0.08] shadow-lg shadow-black/20">
              {currentStream.platform === 'x' ? (
                /* X/Twitter stream — link-based since X restricts embeds */
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-black p-6">
                    <div className="mb-4">
                      {/* X logo */}
                      <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                    <p className="text-white text-lg font-semibold mb-1 text-center line-clamp-2">
                      {currentStream.title}
                    </p>
                    <p className="text-slate-400 text-sm mb-4">
                      Live on X from @{currentStream.channelId}
                    </p>
                    <a
                      href={currentStream.watchUrl || currentStream.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Watch on X
                    </a>
                  </div>
                </div>
              ) : (
                /* YouTube stream — iframe embed */
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${currentStream.videoId}?autoplay=1&mute=1`}
                    title={currentStream.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              )}

              {/* LIVE overlay badge */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/90 text-white text-xs font-bold shadow-lg">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </span>
                {currentStream.platform === 'x' && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/80 text-white text-xs font-medium">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    X
                  </span>
                )}
              </div>
            </div>

            {/* Stream Info */}
            <div className="card-glass p-4">
              <h3 className="text-base md:text-lg font-semibold text-white mb-1 line-clamp-2">
                {currentStream.title}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="font-medium text-white/70">
                  {currentStream.channelName}
                </span>
                {currentStream.platform === 'youtube' && (
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {formatViewerCount(currentStream.viewerCount)} watching
                  </span>
                )}
                {/* Watch on platform link */}
                {currentStream.watchUrl && (
                  <a
                    href={currentStream.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-white/50 hover:text-white transition-colors"
                  >
                    {currentStream.platform === 'x' ? (
                      <>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Watch on X
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                        </svg>
                        Watch on YouTube
                      </>
                    )}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Chat Column (1/3 on desktop) */}
          <div className="lg:col-span-1">
            <LiveDiscussion videoId={currentStream.videoId} />
          </div>
        </div>
      </div>
    </section>
  );
}
