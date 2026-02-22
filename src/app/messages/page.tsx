'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConversationList, { Conversation } from '@/components/community/ConversationList';
import MessageThread, { Message } from '@/components/community/MessageThread';
import { toast } from '@/lib/toast';

// Placeholder current user ID — in production this comes from auth
const CURRENT_USER_ID = 'current-user';

function MessagesPageInner() {
  const searchParams = useSearchParams();
  const toUserId = searchParams.get('to');

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
        const data = await res.json();
        setConversations(data.conversations || []);
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
        const data = await res.json();
        setMessages(data.messages || []);
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
      }
      // If no existing, the first message sent will create the conversation
    }
  }, [toUserId, loading, conversations, fetchMessages]);

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

      if (activeConversationId) {
        body.conversationId = activeConversationId;
      } else if (toUserId) {
        body.recipientId = toUserId;
      } else {
        toast.error('No conversation selected');
        return;
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        // If new conversation was created, update state
        if (data.conversationId && !activeConversationId) {
          setActiveConversationId(data.conversationId);
        }
        // Refresh messages and conversations
        if (activeConversationId || data.conversationId) {
          fetchMessages(activeConversationId || data.conversationId);
        }
        fetchConversations();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to send message');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - only show on mobile when list is visible */}
        <div className="sm:block">
          <AnimatedPageHeader
            title="Messages"
            subtitle="Direct conversations with space industry professionals."
            icon={<span>{"✉️"}</span>}
            breadcrumb="Community"
          />
        </div>

        {/* Chat layout */}
        <div className="card overflow-hidden" style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
          <div className="flex h-full">
            {/* Conversation list — left panel */}
            <div
              className={`w-full sm:w-80 sm:border-r border-slate-700/50 flex-shrink-0 overflow-y-auto ${
                showList ? 'block' : 'hidden sm:block'
              }`}
            >
              <div className="px-4 py-3 border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300">Conversations</h3>
              </div>
              <ConversationList
                conversations={conversations}
                activeId={activeConversationId || undefined}
                currentUserId={CURRENT_USER_ID}
                onSelect={handleSelectConversation}
              />
            </div>

            {/* Message thread — right panel */}
            <div
              className={`flex-1 flex flex-col ${
                !showList ? 'block' : 'hidden sm:flex'
              }`}
            >
              {/* Mobile back button */}
              <div className="sm:hidden px-4 py-2 border-b border-slate-700/50">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-cyan-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              </div>

              {activeConversationId || toUserId ? (
                loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner size="md" />
                  </div>
                ) : (
                  <MessageThread
                    messages={messages}
                    currentUserId={CURRENT_USER_ID}
                    onSend={handleSendMessage}
                  />
                )
              ) : (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-300 mb-1">Select a Conversation</h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    Choose a conversation from the list or message someone from the professional directory.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
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
