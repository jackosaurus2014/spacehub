'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

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

export default function LaunchLiveChat({ eventId }: LaunchLiveChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    if (!session?.user) return;

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
        const data = await res.json();
        setError(data.error?.message || 'Failed to send message');
        setSending(false);
        return;
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

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col h-full min-h-[400px] max-h-[600px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between flex-shrink-0">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {messages.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No messages yet. Be the first to chat!
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={msg.type === 'system' || msg.type === 'milestone' ? 'text-center' : ''}>
            {msg.type === 'milestone' ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium border border-cyan-500/20">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                {msg.message}
              </div>
            ) : msg.type === 'system' ? (
              <div className="inline-block px-3 py-1.5 rounded-full bg-slate-800/50 text-slate-400 text-xs">
                {msg.message}
              </div>
            ) : (
              <div className={`${msg.userId === session?.user?.id ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block max-w-[85%] ${msg.userId === session?.user?.id ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium ${
                      msg.userId === session?.user?.id ? 'text-cyan-400' : 'text-purple-400'
                    }`}>
                      {msg.userName}
                    </span>
                    <span className="text-slate-500 text-[10px]">{formatTime(msg.createdAt)}</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-sm ${
                    msg.userId === session?.user?.id
                      ? 'bg-cyan-500/15 text-cyan-100 border border-cyan-500/20'
                      : 'bg-slate-800/50 text-slate-200 border border-slate-700/30'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700/50 bg-slate-800/30 flex-shrink-0">
        {!session?.user ? (
          <div className="text-center py-2">
            <a
              href="/auth/login"
              className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              Sign in to join the chat
            </a>
          </div>
        ) : (
          <>
            {error && (
              <div className="text-red-400 text-xs mb-2">{error}</div>
            )}
            {rateLimited && (
              <div className="text-yellow-400 text-xs mb-2">
                Please wait {rateLimitCountdown}s before sending another message
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                maxLength={500}
                disabled={sending || rateLimited}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending || rateLimited}
                className="px-3 py-2 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
