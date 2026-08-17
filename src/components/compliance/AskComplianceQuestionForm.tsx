'use client';

import { useState } from 'react';
import { clientLogger } from '@/lib/client-logger';

const QUESTION_MAX = 2000;

/**
 * Public "Ask an export-compliance question" card. Used on the /compliance
 * Export Controls tab and the public /export-compliance-qa page — asking is
 * never Pro-gated (questions are the input funnel).
 *
 * The `website` field is a honeypot: hidden from humans, and any value in
 * it makes the API silently drop the submission.
 */
export default function AskComplianceQuestionForm() {
  const [question, setQuestion] = useState('');
  const [askerName, setAskerName] = useState('');
  const [askerEmail, setAskerEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/compliance/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          askerName: askerName || undefined,
          askerEmail: askerEmail || undefined,
          website,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setSubmitted(true);
        setQuestion('');
        setAskerName('');
        setAskerEmail('');
      } else {
        setError(data?.error?.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      clientLogger.error('Compliance question submit failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="card p-6 border border-emerald-500/30 bg-emerald-500/5" role="status">
        <h3 className="text-white font-semibold mb-2">Question received</h3>
        <p className="text-sm text-slate-300 mb-3">
          Thanks — your question is with the SpaceNexus team. Answers are posted to the public Q&amp;A
          list below{askerEmail ? '' : ''}, and if you left an email we&apos;ll let you know when yours is
          answered.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-2 min-h-[44px] inline-flex items-center"
        >
          Ask another question
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 border border-white/[0.08] relative">
      <h3 className="text-lg font-semibold text-white mb-1">Ask an export-compliance question</h3>
      <p className="text-xs text-slate-400 mb-4">
        The SpaceNexus team answers questions about ITAR, EAR, sanctions, and space export controls.
        Answered questions are published to the Q&amp;A list.
      </p>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
        <p className="text-xs text-amber-300 leading-relaxed">
          <strong>Not legal advice.</strong> Answers are general information from the SpaceNexus team,
          not legal advice — consult qualified export-control counsel for specific matters.
        </p>
      </div>

      <label htmlFor="compliance-question" className="block text-sm font-medium text-slate-300 mb-1">
        Your question
      </label>
      <textarea
        id="compliance-question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        required
        minLength={10}
        maxLength={QUESTION_MAX}
        rows={4}
        placeholder="e.g. Does a CubeSat star tracker fall under ECCN 9A515, and when would it be ITAR-controlled instead?"
        className="w-full bg-white/[0.06] border border-white/[0.1] text-white/90 rounded-lg px-4 py-3 text-sm placeholder:text-slate-500 mb-1"
      />
      <p className="text-xs text-slate-500 mb-4 text-right">
        {question.length}/{QUESTION_MAX}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
        <div>
          <label htmlFor="compliance-asker-name" className="block text-sm font-medium text-slate-300 mb-1">
            Name <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            id="compliance-asker-name"
            type="text"
            value={askerName}
            onChange={(e) => setAskerName(e.target.value)}
            maxLength={100}
            className="w-full bg-white/[0.06] border border-white/[0.1] text-white/90 rounded-lg px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="compliance-asker-email" className="block text-sm font-medium text-slate-300 mb-1">
            Email <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            id="compliance-asker-email"
            type="email"
            value={askerEmail}
            onChange={(e) => setAskerEmail(e.target.value)}
            maxLength={200}
            placeholder="we'll let you know when it's answered"
            className="w-full bg-white/[0.06] border border-white/[0.1] text-white/90 rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Your name and email are never displayed publicly. Don&apos;t include controlled technical data,
        or confidential or personal information, in your question.
      </p>

      {/* Honeypot — invisible to humans, screen readers skip it */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="compliance-qa-website">Website</label>
        <input
          id="compliance-qa-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-3" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || question.trim().length < 10}
        className="btn-primary text-sm py-2.5 px-6 disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit question'}
      </button>
    </form>
  );
}
