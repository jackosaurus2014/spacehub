'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/lib/toast';
import { getCategoryLabel, getCategoryIcon, formatPrice } from '@/lib/marketplace-types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  rfqData?: RfqData | null;
  matchedProviders?: MatchedProvider[];
  timestamp: Date;
}

interface RfqData {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetCurrency?: string;
  complianceReqs?: string[];
  isPublic?: boolean;
}

interface MatchedProvider {
  name: string;
  slug: string;
  company: string;
  category: string;
  priceMin: number | null;
  priceMax: number | null;
}

export default function CopilotPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingRfq, setSubmittingRfq] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/marketplace/copilot');
    }
  }, [status, router]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/marketplace/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, history }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to get response');
      }

      const data = await res.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        rfqData: data.rfqData,
        matchedProviders: data.matchedProviders,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const submitRfq = async (rfqData: RfqData) => {
    setSubmittingRfq(true);
    try {
      const res = await fetch('/api/marketplace/rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rfqData,
          budgetCurrency: rfqData.budgetCurrency || 'USD',
          complianceReqs: rfqData.complianceReqs || [],
          isPublic: rfqData.isPublic !== false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit RFQ');
      }

      const data = await res.json();
      toast.success('RFQ submitted successfully!');
      router.push(`/marketplace/rfq/${data.rfq.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit RFQ');
    } finally {
      setSubmittingRfq(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!session) return null;

  const SUGGESTIONS = [
    'I need to launch a 200kg satellite to SSO by Q4 2026',
    'Find ground station providers with polar coverage',
    'What does SAR imagery cost for weekly monitoring?',
    'Help me find an electric propulsion system for a GEO comsat',
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/marketplace" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">
              Marketplace
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-slate-300">AI Copilot</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <span className="text-3xl">🤖</span> Procurement Copilot
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Describe what you need in plain language. I&apos;ll help you find providers and create RFQs.
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-[400px] max-h-[calc(100vh-280px)]">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">🛸</div>
            <h2 className="text-xl font-semibold text-white mb-2">How can I help with your procurement?</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Tell me what you need — a launch, satellite imagery, ground stations, components — and I&apos;ll find matching providers and draft an RFQ for you.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="text-xs px-3 py-2 rounded-lg bg-space-800/50 border border-space-600/30 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/20 border border-cyan-500/30 text-slate-200'
                      : 'bg-space-800/60 border border-space-600/30 text-slate-300'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                </div>

                {/* RFQ Data Card */}
                {msg.rfqData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-3 rounded-xl bg-space-800/80 border border-cyan-500/20 p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{getCategoryIcon(msg.rfqData.category)}</span>
                      <h3 className="text-sm font-semibold text-white">Generated RFQ Draft</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                        {getCategoryLabel(msg.rfqData.category)}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500">Title:</span>{' '}
                        <span className="text-white">{msg.rfqData.title}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Description:</span>{' '}
                        <span className="text-slate-300">{msg.rfqData.description.slice(0, 200)}...</span>
                      </div>
                      {(msg.rfqData.budgetMin || msg.rfqData.budgetMax) && (
                        <div>
                          <span className="text-slate-500">Budget:</span>{' '}
                          <span className="text-emerald-400">
                            {formatPrice(msg.rfqData.budgetMin, msg.rfqData.budgetMax)}
                          </span>
                        </div>
                      )}
                      {msg.rfqData.complianceReqs && msg.rfqData.complianceReqs.length > 0 && (
                        <div>
                          <span className="text-slate-500">Compliance:</span>{' '}
                          {msg.rfqData.complianceReqs.map((req, j) => (
                            <span key={j} className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 mr-1">
                              {req}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => submitRfq(msg.rfqData!)}
                        disabled={submittingRfq}
                        className="flex-1 text-xs px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                      >
                        {submittingRfq ? 'Submitting...' : 'Submit This RFQ'}
                      </button>
                      <button
                        onClick={() => {
                          setInput(`Modify the RFQ: ${msg.rfqData!.title}. I'd like to change `);
                          inputRef.current?.focus();
                        }}
                        className="text-xs px-3 py-2 rounded-lg bg-space-700/50 text-slate-400 border border-space-600/30 hover:text-slate-300 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Matched Providers */}
                {msg.matchedProviders && msg.matchedProviders.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 rounded-xl bg-space-800/80 border border-space-600/20 p-4"
                  >
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Matching Providers ({msg.matchedProviders.length})
                    </h4>
                    <div className="space-y-2">
                      {msg.matchedProviders.map((p, j) => (
                        <Link
                          key={j}
                          href={`/marketplace/listings/${p.slug}`}
                          className="flex items-center justify-between p-2 rounded-lg bg-space-700/30 hover:bg-space-700/50 transition-colors group"
                        >
                          <div>
                            <div className="text-xs font-medium text-white group-hover:text-cyan-300 transition-colors">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-slate-500">{p.company}</div>
                          </div>
                          <div className="text-[10px] text-emerald-400">
                            {formatPrice(p.priceMin, p.priceMax)}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="text-[10px] text-slate-600 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-space-800/60 border border-space-600/30 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-gradient-to-t from-space-900 via-space-900 to-transparent pt-4 pb-2">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Describe what you need"
              placeholder="Describe what you need... (e.g., 'I need to launch a 500kg satellite to SSO by Q3 2027')"
              rows={1}
              className="w-full resize-none rounded-xl bg-space-800/60 border border-space-600/30 text-slate-200 placeholder-slate-500 px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-colors"
              style={{ minHeight: '48px', maxHeight: '120px' }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = '48px';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-2">
          Powered by Claude AI. Recommendations are informational only.
        </p>
      </div>
    </div>
  );
}
