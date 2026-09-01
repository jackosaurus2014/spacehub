'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

interface ChatMessage {
  id: string;
  userName: string;
  message: string;
  type: 'chat' | 'system' | 'milestone';
  createdAt: string;
  userId: string | null;
}

interface LaunchLiveChatProps {
  eventId: string;
}

/**
 * Launch-day live chat. Logged-out visitors can post (2026-09-01): the server
 * attributes their messages to a deterministic `Observer-XXXX` handle derived
 * from the httpOnly sn_vid cookie, so the client only learns its own handle
 * from the first successful POST. Signed-in users post under their name.
 */
export default function LaunchLiveChat({ eventId }: LaunchLiveChatProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Anonymous handle assigned by the server (known after the first send).
  const [anonHandle, setAnonHandle] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const isSignedIn = Boolean(session?.user);
  const myUserId = session?.user?.id ?? null;
  const myName = isSignedIn
    ? session?.user?.name || session?.user?.email?.split('@')[0] || 'You'
    : anonHandle;

  const scrollToBottom = useCallback(() => {
    // Scroll the chat pane only — scrollIntoView scrolled the whole page to the
    // chat on load (the homepage opened 1,173px down). Audit 2026-08-30.
    const pane = messagesEndRef.current?.parentElement;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/launch-day/${eventId}/chat?limit=200`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages);
      }
    } catch {
      // Silently fail on poll errors
    }
  }, [eventId]);

  // Initial fetch and polling
  useEffect(() => {
    fetchMessages();
    pollInterval.current = setInterval(fetchMessages, 3000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [fetchMessages]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // #chat deep link (T-1h alert email): focus the input so a logged-out reader
  // lands on a usable chat, not just the anchor.
  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#chat') return;
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 300);
    return () => clearTimeout(t);
  }, []);

  // Rate limit countdown
  useEffect(() => {
    if (rateLimitCountdown <= 0) {
      setRateLimited(false);
      return;
    }
    const timer = setTimeout(() => setRateLimitCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [rateLimitCountdown]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending || rateLimited) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/launch-day/${eventId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
        setRateLimited(true);
        setRateLimitCountdown(retryAfter);
        setSending(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error?.message ||
            (typeof data.error === 'string' ? data.error : null) ||
            'Failed to send message'
        );
        setSending(false);
        return;
      }

      const data = await res.json().catch(() => null);
      if (data?.data?.anonymous && data.data.userName) {
        setAnonHandle(data.data.userName);
      }

      setNewMessage('');
      // Fetch updated messages immediately
      await fetchMessages();
    } catch {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const isMine = (msg: ChatMessage) => {
    if (myUserId) return msg.userId === myUserId;
    return Boolean(anonHandle) && msg.userId === null && msg.userName === anonHandle;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  const signInHref = `/login?returnTo=${encodeURIComponent(`${pathname || '/'}#chat`)}`;

  return (
    <section
      aria-label="Live chat"
      className="bg-black/95 rounded-xl border border-white/[0.06] overflow-hidden flex flex-col h-full min-h-[400px] max-h-[600px]"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.04] flex items-center justify-between flex-shrink-0">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Live Chat
        </h3>
        <span className="text-xs text-slate-400">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Chat messages"
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {messages.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No messages yet. Be the first to chat!
          </div>
        )}

        {messages.map((msg) => {
          const mine = isMine(msg);
          return (
            <div key={msg.id} className={msg.type === 'system' || msg.type === 'milestone' ? 'text-center' : ''}>
              {msg.type === 'milestone' ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-white/70 text-xs font-medium border border-white/10">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" aria-hidden="true" />
                  {msg.message}
                </div>
              ) : msg.type === 'system' ? (
                <div className="inline-block px-3 py-1.5 rounded-full bg-white/[0.04] text-slate-400 text-xs">
                  {msg.message}
                </div>
              ) : (
                <div className={mine ? 'text-right' : 'text-left'}>
                  <div className={`inline-block max-w-[85%] ${mine ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-medium ${
                        mine ? 'text-white/70' : msg.userId ? 'text-purple-400' : 'text-cyan-400/80'
                      }`}>
                        {msg.userName}
                      </span>
                      <span className="text-slate-500 text-xs">{formatTime(msg.createdAt)}</span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-sm break-words ${
                      mine
                        ? 'bg-white/8 text-white/90 border border-white/10'
                        : 'bg-white/[0.04] text-white/90 border border-white/[0.04]'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — open to everyone; anonymous visitors post as Observer-XXXX. */}
      <div className="p-3 border-t border-white/[0.06] bg-white/[0.03] flex-shrink-0">
        {error && (
          <div className="text-red-400 text-xs mb-2" role="alert">{error}</div>
        )}
        {rateLimited && (
          <div className="text-yellow-400 text-xs mb-2" role="status">
            Please wait {rateLimitCountdown}s before sending another message
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <label htmlFor={`launch-chat-input-${eventId}`} className="sr-only">
            Chat message
          </label>
          <input
            id={`launch-chat-input-${eventId}`}
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isSignedIn ? 'Type a message...' : 'Say something — no account needed'}
            maxLength={500}
            autoComplete="off"
            disabled={sending || rateLimited}
            className="flex-1 min-w-0 bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!newMessage.trim() || sending || rateLimited}
            className="min-w-[44px] min-h-[44px] px-3 rounded-lg bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between gap-2 flex-wrap">
          {isSignedIn ? (
            <span>
              Chatting as <span className="text-white/70">{myName}</span>
            </span>
          ) : (
            <>
              <span>
                Chatting as{' '}
                <span className="text-cyan-400/80">{anonHandle ?? 'an anonymous Observer'}</span>
              </span>
              <a
                href={signInHref}
                className="text-white/70 hover:text-white underline underline-offset-2 transition-colors motion-reduce:transition-none inline-flex items-center min-h-[44px] -my-3"
              >
                Sign in to use your name
              </a>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
