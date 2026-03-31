'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConversationList, { Conversation } from '@/components/community/ConversationList';
import MessageThread, { Message } from '@/components/community/MessageThread';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import ScrollReveal from '@/components/ui/ScrollReveal';
import EmptyState from '@/components/ui/EmptyState';

/**
 * Map the API conversation response to the shape ConversationList expects.
 * API returns: { id, lastMessageAt, lastMessage: { content, sender, createdAt }, otherParticipants, unreadCount }
 * ConversationList expects: { id, participants, lastMessage, unreadCount, updatedAt }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConversation(raw: any): Conversation {
  return {
    id: raw.id,
    participants: (raw.otherParticipants || raw.participants || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => ({
        id: p.id,
        name: p.name || null,
        email: p.email || '',
      })
    ),
    lastMessage: raw.lastMessage
      ? {
          content: raw.lastMessage.content,
          senderId: raw.lastMessage.senderId || raw.lastMessage.sender?.id || '',
          createdAt: raw.lastMessage.createdAt,
        }
      : null,
    unreadCount: raw.unreadCount || 0,
    updatedAt: raw.lastMessageAt || raw.updatedAt || raw.createdAt || '',
  };
}

/**
 * Map API message to the shape MessageThread expects.
 * API returns: { id, content, senderId, createdAt, sender: { id, name } }
 * MessageThread expects: { id, content, senderId, senderName, createdAt }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(raw: any): Message {
  return {
    id: raw.id,
    content: raw.content,
    senderId: raw.senderId || raw.sender?.id || '',
    senderName: raw.senderName || raw.sender?.name || null,
    createdAt: raw.createdAt,
  };
}

function MessagesPageInner() {
  const searchParams = useSearchParams();
  const toUserId = searchParams.get('to');
  const composeName = searchParams.get('name');
  const composeMode = searchParams.get('compose') === 'true';
  const { data: session } = useSession();
  const currentUserId = (session?.user as Record<string, unknown>)?.id as string || '';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showList, setShowList] = useState(true); // mobile toggle

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      if (res.ok) {
        const json = await res.json();
        // API returns { success, data: { conversations } }
        const rawConversations = json?.data?.conversations || json?.conversations || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setConversations(rawConversations.map((c: any) => mapConversation(c)));
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}`);
      if (res.ok) {
        const json = await res.json();
        // API returns { success, data: { messages, pagination } }
        const rawMessages = json?.data?.messages || json?.messages || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages(rawMessages.map((m: any) => mapMessage(m)));
      }
    } catch {
      // silently fail
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle ?to= parameter — create or find a conversation
  useEffect(() => {
    if (toUserId && !loading) {
      // Check if conversation with this user already exists
      const existing = conversations.find((c) =>
        c.participants.some((p) => p.id === toUserId)
      );
      if (existing) {
        setActiveConversationId(existing.id);
        fetchMessages(existing.id);
        setShowList(false);
      } else if (composeMode) {
        // No existing conversation — show compose view (message thread with no messages)
        setShowList(false);
      }
    }
  }, [toUserId, loading, conversations, fetchMessages, composeMode]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (activeConversationId) {
        fetchMessages(activeConversationId);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeConversationId, fetchConversations, fetchMessages]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    fetchMessages(id);
    setShowList(false);
  };

  const handleSendMessage = async (content: string) => {
    try {
      const body: Record<string, string> = { content };

      // Determine recipientId: from URL param, or from the active conversation's other participant
      let recipient = toUserId;
      if (!recipient && activeConversationId) {
        const conv = conversations.find((c) => c.id === activeConversationId);
        const other = conv?.participants.find((p) => p.id !== currentUserId);
        recipient = other?.id || null;
      }

      if (recipient) {
        body.recipientId = recipient;
      }

      if (!body.recipientId) {
        toast.error('No conversation selected');
        return;
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        const newConversationId = json?.data?.conversationId || json?.conversationId;
        // If new conversation was created, update state
        if (newConversationId && !activeConversationId) {
          setActiveConversationId(newConversationId);
        }
        // Refresh messages and conversations
        const convId = activeConversationId || newConversationId;
        if (convId) {
          fetchMessages(convId);
        }
        fetchConversations();
      } else {
        const data = await res.json();
        toast.error(extractApiError(data, 'Failed to send message'));
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
  };

  const handleBack = () => {
    setShowList(true);
    setActiveConversationId(null);
    setMessages([]);
  };

  if (!session?.user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign in to access messages</h2>
          <Link href="/login" className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-lg min-h-[44px] inline-flex items-center">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Determine the compose header name: from URL param or from matched conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const recipientName =
    composeName ||
    activeConversation?.participants.find((p) => p.id !== currentUserId)?.name ||
    null;

  const isComposeNew = composeMode && toUserId && !activeConversationId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <ScrollReveal>
          <div className="sm:block">
            <AnimatedPageHeader
              title="Messages"
              subtitle="Direct conversations with space industry professionals."
              icon={<span>{"\u2709\uFE0F"}</span>}
              breadcrumb="Community"
            />
          </div>
        </ScrollReveal>

        {/* Chat layout */}
        <ScrollReveal delay={0.1}>
        <div className="card overflow-hidden" style={{ height: 'calc(100dvh - 260px)', minHeight: '500px' }}>
          <div className="flex h-full">
            {/* Conversation list -- left panel */}
            <div
              className={`w-full sm:w-80 sm:border-r border-white/[0.06] flex-shrink-0 overflow-y-auto ${
                showList ? 'block' : 'hidden sm:block'
              }`}
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white/70">Conversations</h3>
              </div>
              <ConversationList
                conversations={conversations}
                activeId={activeConversationId || undefined}
                currentUserId={currentUserId}
                onSelect={handleSelectConversation}
              />
            </div>

            {/* Message thread -- right panel */}
            <div
              className={`flex-1 flex flex-col ${
                !showList ? 'block' : 'hidden sm:flex'
              }`}
            >
              {/* Mobile back button + compose header */}
              {(!showList || activeConversationId || isComposeNew) && (
                <div className="px-4 py-2 border-b border-white/[0.06] flex items-center gap-3">
                  <button
                    onClick={handleBack}
                    className="sm:hidden flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  {recipientName && (
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.12] flex items-center justify-center text-xs font-bold text-white/70 flex-shrink-0">
                        {recipientName.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-white truncate">{recipientName}</span>
                      {isComposeNew && (
                        <span className="text-xs text-slate-500 flex-shrink-0">New conversation</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeConversationId || toUserId ? (
                loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner size="md" />
                  </div>
                ) : (
                  <MessageThread
                    messages={messages}
                    currentUserId={currentUserId}
                    onSend={handleSendMessage}
                  />
                )
              ) : (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center px-4">
                  <EmptyState
                    icon={<span className="text-4xl">{"\uD83D\uDCAC"}</span>}
                    illustration="/art/empty-state-getting-started.png"
                    title={conversations.length === 0 ? 'No messages yet' : 'Select a Conversation'}
                    description={conversations.length === 0
                      ? 'Connect with other space professionals to start a conversation.'
                      : 'Choose a conversation from the list to view your messages.'}
                    action={conversations.length === 0 ? (
                      <Link
                        href="/community"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors"
                      >
                        Browse Community
                      </Link>
                    ) : undefined}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <MessagesPageInner />
    </Suspense>
  );
}
