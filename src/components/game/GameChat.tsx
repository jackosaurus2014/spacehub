'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage {
  id: string;
  userId: string;
  companyName: string;
  message: string;
  timestamp: number;
}

interface GameChatProps {
  companyName: string;
}

const POLL_INTERVAL_MS = 10_000;
const RATE_LIMIT_MS = 5_000;

export default function GameChat({ companyName }: GameChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to bottom when new messages arrive or panel opens
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/chat');
      if (!res.ok) return;
      const data = await res.json();
      const newMessages: ChatMessage[] = data.messages || [];
      setMessages(newMessages);

      // Track unread when chat is closed
      if (!isOpen && newMessages.length > lastMessageCountRef.current) {
        setUnreadCount(prev => prev + (newMessages.length - lastMessageCountRef.current));
      }
      lastMessageCountRef.current = newMessages.length;
    } catch {
      // Silently fail — chat is non-critical
    }
  }, [isOpen]);

  // Poll for new messages
  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  // Scroll to bottom when messages change and panel is open
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  // Clear unread when opening
  const handleToggle = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) {
        setUnreadCount(0);
      }
      return !prev;
    });
  }, []);

  // Send a message
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || cooldown) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/space-tycoon/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, companyName }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send');
        setSending(false);
        return;
      }

      setInput('');
      // Start cooldown
      setCooldown(true);
      cooldownTimerRef.current = setTimeout(() => setCooldown(false), RATE_LIMIT_MS);

      // Immediately fetch to show our message
      await fetchMessages();
    } catch {
      setError('Network error');
    } finally {
      setSending(false);
    }
  }, [input, sending, cooldown, companyName, fetchMessages]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  // Format timestamp as HH:MM
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end max-w-[calc(100vw-2rem)]" style={{ pointerEvents: 'auto' }}>
      {/* Expanded Chat Panel */}
      {isOpen && (
        <div
          className="mb-2 rounded-xl overflow-hidden shadow-2xl flex flex-col w-[calc(100vw-2rem)] sm:w-[320px]"
          style={{
            height: 'min(420px, calc(100vh - 6rem))',
            background: 'linear-gradient(180deg, #0d0d1a 0%, #0a0a0f 100%)',
            border: '1px solid rgba(99, 179, 237, 0.2)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background: 'rgba(99, 179, 237, 0.08)',
              borderBottom: '1px solid rgba(99, 179, 237, 0.15)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">💬</span>
              <span className="text-sm font-semibold text-cyan-300">Global Chat</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                style={{ background: 'rgba(99, 179, 237, 0.15)', color: 'rgba(148, 163, 184, 0.8)' }}
              >
                {messages.length}
              </span>
            </div>
            <button
              onClick={handleToggle}
              className="text-slate-400 hover:text-white transition-colors text-lg leading-none"
              aria-label="Close chat"
            >
              &times;
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ scrollbarWidth: 'thin' }}>
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-slate-500 text-center">
                  No messages yet.<br />Be the first to say something!
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="group">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-xs font-semibold shrink-0"
                    style={{ color: '#67e8f9' }}
                  >
                    {msg.companyName}
                  </span>
                  <span
                    className="text-[10px] shrink-0"
                    style={{ color: 'rgba(100, 116, 139, 0.7)' }}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed break-words pl-0 mt-0.5">
                  {msg.message}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Display */}
          {error && (
            <div
              className="px-3 py-1.5 text-[10px] shrink-0"
              style={{ color: '#f87171', background: 'rgba(248, 113, 113, 0.08)' }}
            >
              {error}
            </div>
          )}

          {/* Input Area */}
          <div
            className="px-3 py-2.5 flex gap-2 items-center shrink-0"
            style={{
              borderTop: '1px solid rgba(99, 179, 237, 0.15)',
              background: 'rgba(0, 0, 0, 0.3)',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={cooldown ? 'Wait...' : 'Type a message...'}
              maxLength={200}
              disabled={sending || cooldown}
              className="flex-1 text-xs bg-transparent outline-none placeholder-slate-600 text-slate-200 disabled:opacity-50"
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(99, 179, 237, 0.15)',
                background: 'rgba(255, 255, 255, 0.03)',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || cooldown}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{
                background: !input.trim() || sending || cooldown
                  ? 'rgba(99, 179, 237, 0.1)'
                  : 'rgba(99, 179, 237, 0.25)',
                color: '#67e8f9',
                border: '1px solid rgba(99, 179, 237, 0.2)',
              }}
              aria-label="Send message"
            >
              {sending ? '...' : '↑'}
            </button>
          </div>
        </div>
      )}

      {/* Chat Toggle Button */}
      <button
        onClick={handleToggle}
        className="relative w-12 h-12 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
        style={{
          background: isOpen
            ? 'rgba(99, 179, 237, 0.3)'
            : 'linear-gradient(135deg, rgba(99, 179, 237, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%)',
          border: '1px solid rgba(99, 179, 237, 0.3)',
          boxShadow: '0 4px 20px rgba(99, 179, 237, 0.15)',
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        <span className="text-lg">{isOpen ? '✕' : '💬'}</span>

        {/* Unread Badge */}
        {!isOpen && unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
            style={{ background: '#ef4444' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
