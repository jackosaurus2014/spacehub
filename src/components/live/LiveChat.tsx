'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
}

const STORAGE_KEY = 'spacenexus-live-chat';
const USERNAME_KEY = 'spacenexus-chat-username';

// System messages to add atmosphere
const SYSTEM_MESSAGES = [
  { message: 'Welcome to SpaceNexus Live Chat!', delay: 0 },
];

// Simulated chat messages for atmosphere when chat is empty
const SIMULATED_MESSAGES = [
  { username: 'SpaceEnthusiast42', message: 'Excited for this launch!' },
  { username: 'RocketWatcher', message: 'Weather looking good at the launch site' },
  { username: 'OrbitFan', message: 'Anyone know the payload mass?' },
  { username: 'LaunchTracker', message: 'T-2 hours and counting!' },
  { username: 'SatelliteNerd', message: 'This booster has flown 15 times before' },
  { username: 'AstroFan2024', message: 'Love watching these live streams' },
];

export default function LiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load messages and username from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    const savedUsername = localStorage.getItem(USERNAME_KEY);

    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages) as ChatMessage[];
        // Filter out old messages (older than 24 hours)
        const recentMessages = parsed.filter(
          (m) => Date.now() - m.timestamp < 24 * 60 * 60 * 1000
        );
        setMessages(recentMessages);
      } catch (e) {
        console.error('Failed to parse saved messages:', e);
      }
    }

    if (savedUsername) {
      setUsername(savedUsername);
    }

    // Add system welcome message if no messages
    if (!savedMessages || JSON.parse(savedMessages).length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'system-welcome',
        username: 'System',
        message: 'Welcome to SpaceNexus Live Chat! Set your username to join the conversation.',
        timestamp: Date.now(),
        isSystem: true,
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to newest message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Add simulated messages periodically for atmosphere
  useEffect(() => {
    if (messages.length < 3) {
      const interval = setInterval(() => {
        const randomMsg = SIMULATED_MESSAGES[Math.floor(Math.random() * SIMULATED_MESSAGES.length)];
        const simulatedMessage: ChatMessage = {
          id: `sim-${Date.now()}`,
          username: randomMsg.username,
          message: randomMsg.message,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, simulatedMessage]);
      }, 15000); // Add a simulated message every 15 seconds

      return () => clearInterval(interval);
    }
  }, [messages.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    if (!username) {
      setIsEditingUsername(true);
      return;
    }

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username,
      message: newMessage.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage('');
  };

  const handleSetUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUsername.trim()) return;

    const sanitizedUsername = tempUsername.trim().slice(0, 20);
    setUsername(sanitizedUsername);
    localStorage.setItem(USERNAME_KEY, sanitizedUsername);
    setIsEditingUsername(false);
    setTempUsername('');
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const clearChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([{
      id: 'system-cleared',
      username: 'System',
      message: 'Chat history cleared.',
      timestamp: Date.now(),
      isSystem: true,
    }]);
  };

  return (
    <div className="bg-gradient-to-br from-space-900/95 via-space-800/95 to-space-900/95 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-space-800/50 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Live Chat
        </h3>
        <div className="flex items-center gap-2">
          {username && (
            <button
              onClick={() => setIsEditingUsername(true)}
              className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <span className="truncate max-w-[100px]">{username}</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          <button
            onClick={clearChat}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            title="Clear chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Username Modal */}
      {isEditingUsername && (
        <div className="absolute inset-0 z-10 bg-space-900/95 flex items-center justify-center p-4">
          <div className="bg-space-800 rounded-xl border border-cyan-500/30 p-6 max-w-sm w-full">
            <h4 className="text-white font-semibold mb-4">
              {username ? 'Change Username' : 'Set Your Username'}
            </h4>
            <form onSubmit={handleSetUsername}>
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="Enter username"
                maxLength={20}
                className="w-full px-4 py-2 rounded-lg bg-space-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-400 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingUsername(false);
                    setTempUsername('');
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${
              msg.isSystem
                ? 'text-center'
                : msg.username === username
                ? 'text-right'
                : ''
            }`}
          >
            {msg.isSystem ? (
              <div className="inline-block px-3 py-1.5 rounded-full bg-slate-800/50 text-slate-400 text-xs">
                {msg.message}
              </div>
            ) : (
              <div
                className={`inline-block max-w-[85%] ${
                  msg.username === username ? 'text-right' : 'text-left'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium ${
                      msg.username === username ? 'text-cyan-400' : 'text-purple-400'
                    }`}
                  >
                    {msg.username}
                  </span>
                  <span className="text-slate-600 text-xs">{formatTimestamp(msg.timestamp)}</span>
                </div>
                <div
                  className={`px-3 py-2 rounded-lg text-sm ${
                    msg.username === username
                      ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/30'
                      : 'bg-slate-800/50 text-slate-200 border border-slate-700/30'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700/50 bg-space-800/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={username ? 'Type a message...' : 'Set username to chat'}
            maxLength={500}
            className="flex-1 px-4 py-2 rounded-lg bg-space-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!newMessage.trim()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        {!username && (
          <button
            type="button"
            onClick={() => setIsEditingUsername(true)}
            className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Click here to set your username
          </button>
        )}
      </form>
    </div>
  );
}
