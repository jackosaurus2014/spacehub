'use client';

import { motion } from 'framer-motion';

interface Participant {
  id: string;
  name: string | null;
  email: string;
}

export interface Conversation {
  id: string;
  participants: Participant[];
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  currentUserId: string;
  onSelect: (id: string) => void;
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ConversationList({ conversations, activeId, currentUserId, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-slate-400 text-sm">No conversations yet</p>
        <p className="text-slate-500 text-xs mt-1">Start messaging space professionals from the directory</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-700/50">
      {conversations.map((conv, idx) => {
        const otherParticipant = conv.participants.find((p) => p.id !== currentUserId) || conv.participants[0];
        const isActive = conv.id === activeId;
        const hasUnread = conv.unreadCount > 0;

        return (
          <motion.button
            key={conv.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.3 }}
            onClick={() => onSelect(conv.id)}
            className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors hover:bg-slate-800/60 ${
              isActive ? 'bg-cyan-500/10 border-l-2 border-cyan-500' : 'border-l-2 border-transparent'
            }`}
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 relative">
              {getInitials(otherParticipant?.name)}
              {hasUnread && (
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-cyan-500 rounded-full border-2 border-slate-900" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-sm font-medium truncate ${hasUnread ? 'text-white' : 'text-slate-300'}`}>
                  {otherParticipant?.name || 'Unknown'}
                </span>
                {conv.lastMessage && (
                  <span className="text-[10px] text-slate-500 flex-shrink-0 ml-2">
                    {timeAgo(conv.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              {conv.lastMessage && (
                <p className={`text-xs truncate ${hasUnread ? 'text-slate-300' : 'text-slate-500'}`}>
                  {conv.lastMessage.senderId === currentUserId ? 'You: ' : ''}
                  {conv.lastMessage.content}
                </p>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
