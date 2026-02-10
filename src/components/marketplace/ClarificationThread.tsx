'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

interface Clarification {
  id: string;
  authorRole: string;
  companyId: string | null;
  question: string;
  answer: string | null;
  isPublic: boolean;
  createdAt: string;
  answeredAt: string | null;
}

interface ClarificationThreadProps {
  rfqId: string;
  userRole: 'buyer' | 'provider' | 'public';
}

export default function ClarificationThread({ rfqId, userRole }: ClarificationThreadProps) {
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [isPublicQ, setIsPublicQ] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchClarifications = async () => {
    try {
      const res = await fetch(`/api/marketplace/rfq/${rfqId}/clarifications`);
      if (res.ok) {
        const data = await res.json();
        setClarifications(data.clarifications || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClarifications(); }, [rfqId]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/rfq/${rfqId}/clarifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, isPublic: isPublicQ }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit question');
      }
      toast.success('Question submitted');
      setQuestion('');
      fetchClarifications();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = async (clarificationId: string) => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/rfq/${rfqId}/clarifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clarificationId, answer: answerText }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit answer');
      }
      toast.success('Answer submitted');
      setAnswerText('');
      setAnsweringId(null);
      fetchClarifications();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-slate-500">Loading clarifications...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white">
        Q&A ({clarifications.length})
      </h3>

      {/* Thread */}
      {clarifications.length > 0 ? (
        <div className="space-y-3">
          {clarifications.map((c) => (
            <div key={c.id} className="card p-4 space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 flex-shrink-0 mt-0.5">
                  Q
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-slate-500">
                      {c.authorRole === 'provider' ? 'Provider' : 'Buyer'}
                    </span>
                    {!c.isPublic && (
                      <span className="text-[10px] px-1 py-0.5 bg-yellow-500/10 text-yellow-500 rounded">Private</span>
                    )}
                    <span className="text-[10px] text-slate-600">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{c.question}</p>
                </div>
              </div>

              {c.answer ? (
                <div className="flex items-start gap-3 ml-4 pl-4 border-l border-slate-700/50">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs text-green-400 flex-shrink-0 mt-0.5">
                    A
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-slate-500">Buyer</span>
                      <span className="text-[10px] text-slate-600">
                        {c.answeredAt ? new Date(c.answeredAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{c.answer}</p>
                  </div>
                </div>
              ) : userRole === 'buyer' ? (
                answeringId === c.id ? (
                  <div className="ml-4 pl-4 border-l border-slate-700/50 space-y-2">
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Write your answer..."
                      rows={3}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAnswer(c.id)}
                        disabled={submitting || !answerText.trim()}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white text-xs rounded font-medium"
                      >
                        {submitting ? 'Submitting...' : 'Submit Answer'}
                      </button>
                      <button
                        onClick={() => { setAnsweringId(null); setAnswerText(''); }}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAnsweringId(c.id)}
                    className="ml-14 text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Answer this question
                  </button>
                )
              ) : (
                <div className="ml-14 text-xs text-slate-500 italic">
                  Awaiting answer from buyer
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-500">No questions yet.</div>
      )}

      {/* Ask Question Form (providers only) */}
      {userRole === 'provider' && (
        <form onSubmit={handleAskQuestion} className="card p-4 space-y-3">
          <div className="text-sm font-medium text-white">Ask a Question</div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this RFQ..."
            rows={3}
            maxLength={2000}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={isPublicQ}
                onChange={(e) => setIsPublicQ(e.target.checked)}
                className="rounded bg-slate-700 border-slate-600"
              />
              Make question public (visible to all providers)
            </label>
            <button
              type="submit"
              disabled={submitting || !question.trim()}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white text-xs rounded-lg font-medium"
            >
              {submitting ? 'Submitting...' : 'Submit Question'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
