'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import VerifiedBadge from '@/components/VerifiedBadge';
import { clientLogger } from '@/lib/client-logger';

interface ChatReactions {
  counts: Record<string, number>;
  mine: string[];
}

interface ChatMessage {
  id: string;
  userId: string | null;
  userName: string;
  verifiedBadge: string | null;
  message: string;
  type: string; // 'chat' | 'system' | 'milestone'
  createdAt: string;
  reactions: ChatReactions;
}

interface LiveChatPanelProps {
  eventId: string;
  eventName?: string;
}

const POLL_INTERVAL_MS = 2500;
const MAX_MESSAGES_KEPT = 200;

// Reaction set: emoji label -> display char
const REACTIONS: { key: string; char: string; aria: string }[] = [
  { key: 'rocket', char: '🚀', aria: 'Rocket' },
  { key: 'clap', char: '👏', aria: 'Clap' },
  { key: 'tada', char: '🎉', aria: 'Tada' },
  { key: 'heart', char: '❤️', aria: 'Heart' },
  { key: 'fire', char: '🔥', aria: 'Fire' },
  { key: 'eyes', char: '👀', aria: 'Eyes' },
];

const REACTION_LOOKUP: Record<string, string> = REACTIONS.reduce(
  (acc, r) => {
    acc[r.key] = r.char;
    return acc;
  },
  {} as Record<string, string>
);

export default function LiveChatPanel({ eventId, eventName }: LiveChatPanelProps) {
  const { data: session, status: authStatus } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchingRef = useRef(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const currentUserId = session?.user?.id || null;

  // Tick every second so rate-limit countdown updates
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const rateLimitSeconds = Math.max(
    0,
    Math.ceil((rateLimitedUntil - now) / 1000)
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const fetchMessages = useCallback(
    async (initial = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        const params = new URLSearchParams({ eventId });
        if (!initial && lastMessageIdRef.current) {
          params.set('afterId', lastMessageIdRef.current);
        }

        const res = await fetch(`/api/live-chat?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.success) return;

        const incoming: ChatMessage[] = data.data?.messages || [];
        if (incoming.length === 0 && !initial) return;

        if (!isMountedRef.current) return;

        if (initial) {
          setMessages(incoming);
          if (incoming.length > 0) {
            lastMessageIdRef.current = incoming[incoming.length - 1].id;
          }
        } else {
          setMessages((prev) => {
            // Merge, dedupe by id, keep latest reactions
            const merged = [...prev];
            const seen = new Set(prev.map((m) => m.id));
            for (const m of incoming) {
              if (!seen.has(m.id)) {
                merged.push(m);
                seen.add(m.id);
              }
            }
            // Cap memory
            const trimmed =
              merged.length > MAX_MESSAGES_KEPT
                ? merged.slice(merged.length - MAX_MESSAGES_KEPT)
                : merged;
            if (trimmed.length > 0) {
              lastMessageIdRef.current = trimmed[trimmed.length - 1].id;
            }
            return trimmed;
          });
        }
      } catch (err) {
        clientLogger.warn('LiveChatPanel poll failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        fetchingRef.current = false;
      }
    },
    [eventId]
  );

  // Refetch reactions for visible messages periodically (whole list reload)
  const refetchAll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(`/api/live-chat?eventId=${encodeURIComponent(eventId)}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.success) return;
      const incoming: ChatMessage[] = data.data?.messages || [];
      if (!isMountedRef.current) return;
      setMessages(incoming);
      if (incoming.length > 0) {
        lastMessageIdRef.current = incoming[incoming.length - 1].id;
      }
    } catch {
      /* swallow */
    } finally {
      fetchingRef.current = false;
    }
  }, [eventId]);

  // Polling lifecycle with Page Visibility
  useEffect(() => {
    isMountedRef.current = true;

    const start = () => {
      if (pollRef.current) return;
      // Counter to occasionally refetch the entire visible window for reaction updates
      let tick = 0;
      pollRef.current = setInterval(() => {
        tick++;
        if (tick % 6 === 0) {
          // every ~15s do a full refresh to pick up reaction count changes
          refetchAll();
        } else {
          fetchMessages(false);
        }
      }, POLL_INTERVAL_MS);
    };

    const stop = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        stop();
      } else {
        // Refresh and resume
        fetchMessages(false);
        start();
      }
    };

    // Initial load + start
    fetchMessages(true);
    start();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      isMountedRef.current = false;
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [eventId, fetchMessages, refetchAll]);

  // Send a message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (sending) return;
    if (rateLimitSeconds > 0) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) {
      setError('Message must be 500 characters or fewer');
      return;
    }
    if (!session?.user) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/live-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, message: trimmed }),
      });

      if (res.status === 429) {
        const retryAfter = parseInt(
          res.headers.get('Retry-After') || '2',
          10
        );
        setRateLimitedUntil(Date.now() + retryAfter * 1000);
        setSending(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          data?.error?.message ||
            (typeof data?.error === 'string' ? data.error : null) ||
            'Failed to send message'
        );
        setSending(false);
        return;
      }

      setDraft('');
      // Trigger an immediate fetch
      fetchMessages(false);
    } catch (err) {
      clientLogger.error('LiveChatPanel send failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // React to a message
  const handleReact = async (messageId: string, emoji: string) => {
    if (!session?.user) return;

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const hasReacted = m.reactions.mine.includes(emoji);
        const counts = { ...m.reactions.counts };
        const mine = [...m.reactions.mine];
        if (hasReacted) {
          counts[emoji] = Math.max(0, (counts[emoji] || 1) - 1);
          if (counts[emoji] === 0) delete counts[emoji];
          const idx = mine.indexOf(emoji);
          if (idx >= 0) mine.splice(idx, 1);
        } else {
          counts[emoji] = (counts[emoji] || 0) + 1;
          mine.push(emoji);
        }
        return { ...m, reactions: { counts, mine } };
      })
    );
    setOpenPickerFor(null);

    try {
      const target = messages.find((m) => m.id === messageId);
      const alreadyReacted = target?.reactions.mine.includes(emoji);
      const method = alreadyReacted ? 'DELETE' : 'POST';
      await fetch('/api/live-chat/reaction', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      });
    } catch (err) {
      clientLogger.warn('Reaction failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      const res = await fetch(`/api/live-chat/${messageId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch (err) {
      clientLogger.warn('Delete failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleFlag = async (messageId: string) => {
    if (!session?.user) return;
    if (!confirm('Flag this message for moderator review?')) return;
    try {
      const res = await fetch(`/api/live-chat/${messageId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'inappropriate' }),
      });
      if (res.ok) {
        setError(null);
        // brief inline confirmation
        alert('Message flagged. Thanks — moderators will review it.');
      } else if (res.status === 409) {
        alert('You already flagged this message.');
      }
    } catch (err) {
      clientLogger.warn('Flag failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const formatTime = useMemo(
    () => (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    []
  );

  const isAdmin = Boolean(session?.user?.isAdmin);
  const isLoading = authStatus === 'loading';

  return (
    <div className="bg-black/95 rounded-xl border border-white/[0.08] overflow-hidden flex flex-col h-full min-h-[400px] max-h-[600px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-white/[0.04] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative inline-flex h-2 w-2 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          <h3 className="text-white font-semibold text-sm truncate">
            Live chat{eventName ? ` — ${eventName}` : ''}
          </h3>
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {messages.length} msg{messages.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">
            No messages yet. Be the first to chat!
          </div>
        )}

        {messages.map((msg) => {
          const isMine = currentUserId && msg.userId === currentUserId;
          const isSystem = msg.type === 'system' || msg.type === 'milestone';

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <div className="inline-block px-3 py-1.5 rounded-full bg-white/[0.04] text-slate-400 text-xs border border-white/[0.06]">
                  {msg.message}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="group">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span
                      className={`text-xs font-semibold ${
                        isMine ? 'text-white' : 'text-white/80'
                      }`}
                    >
                      {msg.userName}
                    </span>
                    {msg.verifiedBadge && (
                      <VerifiedBadge badge={msg.verifiedBadge} size="sm" />
                    )}
                    <span className="text-slate-500 text-[10px]">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-lg text-sm break-words border ${
                      isMine
                        ? 'bg-white/[0.08] border-white/[0.12] text-white'
                        : 'bg-white/[0.04] border-white/[0.06] text-white/90'
                    }`}
                  >
                    {msg.message}
                  </div>

                  {/* Reactions bar */}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {Object.entries(msg.reactions.counts).map(
                      ([emoji, count]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReact(msg.id, emoji)}
                          disabled={!session?.user}
                          aria-label={`${REACTION_LOOKUP[emoji] || emoji} reaction (${count})`}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                            msg.reactions.mine.includes(emoji)
                              ? 'bg-white/15 border-white/25 text-white'
                              : 'bg-white/[0.04] border-white/[0.08] text-white/70 hover:bg-white/[0.08]'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <span>{REACTION_LOOKUP[emoji] || emoji}</span>
                          <span className="text-[10px] font-medium">
                            {count}
                          </span>
                        </button>
                      )
                    )}

                    {session?.user && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenPickerFor(
                              openPickerFor === msg.id ? null : msg.id
                            )
                          }
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center justify-center w-6 h-5 rounded-full text-xs bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] transition-opacity"
                          aria-label="Add reaction"
                          aria-expanded={openPickerFor === msg.id}
                        >
                          +
                        </button>
                        {openPickerFor === msg.id && (
                          <div
                            role="menu"
                            className="absolute z-20 left-0 top-full mt-1 bg-black border border-white/[0.12] rounded-lg shadow-lg p-1 flex gap-0.5"
                          >
                            {REACTIONS.map((r) => (
                              <button
                                key={r.key}
                                type="button"
                                onClick={() => handleReact(msg.id, r.key)}
                                className="w-7 h-7 rounded hover:bg-white/[0.08] text-base flex items-center justify-center"
                                aria-label={r.aria}
                                title={r.aria}
                              >
                                {r.char}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline mod actions */}
                    {session?.user && (isMine || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(msg.id)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 ml-1 text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                    {session?.user && !isMine && (
                      <button
                        type="button"
                        onClick={() => handleFlag(msg.id)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10px] text-slate-500 hover:text-amber-400 transition-colors"
                      >
                        Flag
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.08] bg-white/[0.03] flex-shrink-0">
        {isLoading ? (
          <div className="text-center text-xs text-slate-500 py-2">
            Loading…
          </div>
        ) : !session?.user ? (
          <div className="text-center py-2">
            <Link
              href="/login"
              className="text-white/80 hover:text-white text-sm font-medium underline-offset-4 hover:underline"
            >
              Sign in to join the chat
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="text-red-400 text-xs mb-2" role="alert">
                {error}
              </div>
            )}
            {rateLimitSeconds > 0 && (
              <div className="text-yellow-400 text-xs mb-2">
                Slow down — wait {rateLimitSeconds}s
              </div>
            )}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message…"
                maxLength={500}
                disabled={sending || rateLimitSeconds > 0}
                aria-label="Chat message"
                className="flex-1 bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending || rateLimitSeconds > 0}
                className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Send
              </button>
            </form>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                {draft.length}/500
              </span>
              <span className="text-[10px] text-slate-500">
                Enter to send
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
