'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/lib/toast';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

interface RelatedCompany {
  name: string;
  slug: string;
  sector: string | null;
}

interface ResearchMessage {
  role: 'user' | 'assistant';
  content: string;
  relatedCompanies?: RelatedCompany[];
  confidence?: 'high' | 'medium' | 'low';
  source?: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  'Tell me about SpaceX',
  'Who competes with Rocket Lab in the small launch market?',
  'Which companies focus on Earth observation?',
  'How much funding has Axiom Space raised?',
  'Compare satellite manufacturers',
  'Which space companies are publicly traded?',
];

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: 'High Confidence', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
  medium: { label: 'Medium Confidence', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' },
  low: { label: 'Low Confidence', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/30' },
};

function formatAnswer(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    // Bold text wrapped in **
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const formattedParts = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      // Inline links [text](/path)
      const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g);
      if (linkParts.length > 1) {
        return linkParts.map((lp, k) => {
          const linkMatch = lp.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (linkMatch) {
            return (
              <Link
                key={k}
                href={linkMatch[2]}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
              >
                {linkMatch[1]}
              </Link>
            );
          }
          return lp;
        });
      }
      return part;
    });

    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-cyan-500 mt-1 flex-shrink-0">&#8226;</span>
          <span>{formattedParts.slice(0).map((p, idx) => <span key={idx}>{typeof p === 'string' ? p.replace(/^[-*]\s/, '') : p}</span>)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<div key={i}>{formattedParts}</div>);
    }
  });

  return elements;
}

export default function CompanyResearchPage() {
  const [messages, setMessages] = useState<ResearchMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCompanySlug, setSelectedCompanySlug] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendQuestion = async (questionText?: string) => {
    const question = (questionText || input).trim();
    if (!question || loading) return;

    const userMessage: ResearchMessage = {
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/company-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          companySlug: selectedCompanySlug,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to get response');
      }

      const data = await res.json();

      const assistantMessage: ResearchMessage = {
        role: 'assistant',
        content: data.answer,
        relatedCompanies: data.relatedCompanies,
        confidence: data.confidence,
        source: data.source,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If a company was found in related results and user didn't have one selected,
      // auto-select the first one for follow-up context
      if (!selectedCompanySlug && data.relatedCompanies?.length === 1) {
        setSelectedCompanySlug(data.relatedCompanies[0].slug);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your question. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  const clearContext = () => {
    setSelectedCompanySlug(null);
    toast.success('Company context cleared');
  };

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto p-4 sm:p-6">
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Company Profiles', href: '/company-profiles' },
          { name: 'Research Assistant' },
        ]}
      />

      <AnimatedPageHeader
        title="Company Research Assistant"
        subtitle="Ask questions about space industry companies in natural language. Get instant answers from our database of 100+ company profiles."
        accentColor="cyan"
        breadcrumb="Company Intelligence"
      />

      {/* Active Company Context Badge */}
      {selectedCompanySlug && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 text-sm"
        >
          <span className="text-slate-400">Researching:</span>
          <span className="px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-medium">
            {selectedCompanySlug}
          </span>
          <button
            onClick={clearContext}
            className="text-slate-500 hover:text-slate-300 transition-colors text-xs underline"
          >
            Clear
          </button>
        </motion.div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-[400px] max-h-[calc(100vh-380px)]">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              What would you like to know?
            </h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Ask about any space industry company -- their funding, competitors, capabilities, satellite assets, and more.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto">
              {SUGGESTED_QUESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => sendQuestion(suggestion)}
                  className="text-left text-sm px-4 py-3 rounded-xl bg-space-800/50 border border-space-600/30 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 hover:bg-space-800/70 transition-all duration-200"
                >
                  <span className="text-cyan-500/60 mr-2">&#8594;</span>
                  {suggestion}
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
              <div className={`max-w-[90%] sm:max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/20 border border-cyan-500/30 text-slate-200'
                      : 'bg-space-800/60 border border-space-600/30 text-slate-300'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="text-sm leading-relaxed">{msg.content}</div>
                  ) : (
                    <div className="text-sm leading-relaxed space-y-1">
                      {formatAnswer(msg.content)}
                    </div>
                  )}
                </div>

                {/* Confidence Indicator */}
                {msg.confidence && msg.role === 'assistant' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-2 mt-2 px-1"
                  >
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${CONFIDENCE_CONFIG[msg.confidence]?.bg || ''}`}
                    >
                      <span className={CONFIDENCE_CONFIG[msg.confidence]?.color || ''}>
                        {CONFIDENCE_CONFIG[msg.confidence]?.label || msg.confidence}
                      </span>
                    </span>
                    {msg.source && (
                      <span className="text-xs text-slate-600">
                        Source: {msg.source === 'database' ? 'SpaceNexus Database' : 'General Knowledge'}
                      </span>
                    )}
                  </motion.div>
                )}

                {/* Related Companies */}
                {msg.relatedCompanies && msg.relatedCompanies.length > 0 && msg.role === 'assistant' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="mt-3 rounded-xl bg-space-800/80 border border-space-600/20 p-4"
                  >
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Related Companies ({msg.relatedCompanies.length})
                    </h4>
                    <div className="space-y-1.5">
                      {msg.relatedCompanies.map((company, j) => (
                        <div key={j} className="flex items-center justify-between gap-2">
                          <Link
                            href={`/company-profiles/${company.slug}`}
                            className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-space-700/30 hover:bg-space-700/50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-cyan-400 text-xs font-bold">
                                {company.name.charAt(0)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
                                {company.name}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {company.sector || 'Space Industry'}
                              </div>
                            </div>
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedCompanySlug(company.slug);
                              toast.success(`Now researching ${company.name}`);
                            }}
                            className="flex-shrink-0 text-xs px-2 py-1 rounded-lg bg-space-700/50 text-slate-400 hover:text-cyan-300 hover:bg-space-700/80 border border-space-600/20 transition-colors"
                            title={`Set ${company.name} as research context`}
                          >
                            Research
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="text-xs text-slate-600 mt-1 px-1">
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
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-slate-500">Researching...</span>
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
              aria-label="Ask a question about space companies"
              placeholder="Ask about any space company... (e.g., 'Tell me about SpaceX' or 'Who are the top launch providers?')"
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
            onClick={() => sendQuestion()}
            disabled={!input.trim() || loading}
            aria-label="Send question"
            className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-slate-600">
            Answers based on SpaceNexus company database. Data may not reflect the latest changes.
          </p>
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setSelectedCompanySlug(null);
              }}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
