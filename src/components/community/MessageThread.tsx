'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string | null;
  createdAt: string;
}

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  onSend: (content: string) => void;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function MessageThread({ messages, currentUserId, onSend }: MessageThreadProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setInput('');
    try {
      onSend(trimmed);
    } finally {
      setSending(false);
    }
  };

  // Group messages by date
  let lastDate = '';

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-slate-500 text-sm">No messages yet</p>
            <p className="text-slate-600 text-xs mt-1">Send the first message to start the conversation</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = msg.senderId === currentUserId;
          const msgDate = formatDateSeparator(msg.createdAt);
          const showDate = msgDate !== lastDate;
          lastDate = msgDate;

          // Check if same sender as previous message (for grouping)
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const sameSender = prevMsg && prevMsg.senderId === msg.senderId;

          return (
            <div key={msg.id}>
              {/* Date separator */}
              {showDate && (
                <div className="flex items-center justify-center my-4">
                  <div className="h-px flex-1 bg-slate-700/50" />
                  <span className="px-3 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    {msgDate}
                  </span>
                  <div className="h-px flex-1 bg-slate-700/50" />
                </div>
              )}

              {/* Message bubble */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${
                  sameSender && !showDate ? 'mt-0.5' : 'mt-3'
                }`}
              >
                {/* Avatar for others */}
                {!isOwn && !sameSender && (
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0">
                    {getInitials(msg.senderName)}
                  </div>
                )}
                {!isOwn && sameSender && !showDate && <div className="w-7 flex-shrink-0" />}

                <div className={`max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
                  {/* Sender name for group messages */}
                  {!isOwn && !sameSender && (
                    <p className="text-[10px] text-slate-500 mb-0.5 ml-1">
                      {msg.senderName || 'Unknown'}
                    </p>
                  )}

                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isOwn
                        ? 'bg-cyan-600/80 text-white rounded-br-md'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`text-[9px] mt-1 ${isOwn ? 'text-cyan-200/60' : 'text-slate-500'}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-700/50 p-3 bg-slate-900/50">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
