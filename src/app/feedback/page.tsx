'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';

const FEEDBACK_CATEGORIES = [
  { id: 'bug', label: 'Bug Report', icon: '🐛', description: 'Something is broken or not working correctly' },
  { id: 'idea', label: 'Idea / Feature', icon: '💡', description: 'Suggest a new feature or improvement' },
  { id: 'content', label: 'Content / Data', icon: '📊', description: 'Incorrect, missing, or stale information' },
  { id: 'praise', label: 'Praise', icon: '🎉', description: 'Tell us what you love' },
  { id: 'general', label: 'General', icon: '💬', description: 'Anything else on your mind' },
];

function FeedbackForm() {
  const searchParams = useSearchParams();
  const page = searchParams?.get('page') || '';

  const [category, setCategory] = useState('');
  const [tryingTo, setTryingTo] = useState('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !details.trim()) return;

    setSubmitting(true);
    setError(null);

    const message = tryingTo.trim()
      ? `What I was trying to do:\n${tryingTo.trim()}\n\nWhat happened / what I want:\n${details.trim()}`
      : details.trim();

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message,
          page: page || undefined,
          email: email.trim() || undefined,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Something went wrong — please try again.');
      }
    } catch {
      setError('Network error — please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <span className="text-5xl block mb-4" aria-hidden="true">✅</span>
        <h2 className="text-3xl font-bold text-white mb-3">Thank You!</h2>
        <p className="text-slate-400 mb-8">
          Your feedback has been submitted. The founder reads every submission and uses it to improve SpaceNexus.
        </p>
        <Link href="/" className="px-6 py-3 text-sm font-medium text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors">
          Back to Home
        </Link>
      </div>
    );
  }

  const isBugish = category === 'bug' || category === 'content';

  return (
    <div className="max-w-2xl mx-auto">
      {page && (
        <p className="text-slate-500 text-xs mb-4">
          About page: <span className="text-slate-300 font-mono">{page}</span>
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category */}
        <fieldset>
          <legend className="text-white text-sm font-medium block mb-3">What kind of feedback?</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Feedback category">
            {FEEDBACK_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={category === cat.id}
                onClick={() => setCategory(cat.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  category === cat.id
                    ? 'border-purple-500/30 bg-purple-500/10'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                }`}
              >
                <span className="text-lg block mb-1" aria-hidden="true">{cat.icon}</span>
                <span className="text-white text-xs font-medium block">{cat.label}</span>
                <span className="text-slate-500 text-[10px] block">{cat.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* What were you trying to do (optional context) */}
        <div>
          <label htmlFor="feedback-trying" className="text-white text-sm font-medium block mb-2">
            What were you trying to do? <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            id="feedback-trying"
            type="text"
            value={tryingTo}
            onChange={e => setTryingTo(e.target.value)}
            maxLength={500}
            placeholder={isBugish ? 'e.g. Filtering the jobs board by remote roles' : 'e.g. Researching launch providers for a report'}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/30"
          />
        </div>

        {/* What happened / what do you want */}
        <div>
          <label htmlFor="feedback-details" className="text-white text-sm font-medium block mb-2">
            {isBugish ? 'What happened?' : 'What would you like to see?'}
          </label>
          <textarea
            id="feedback-details"
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder={isBugish
              ? 'What went wrong, what you expected instead, and any error messages you saw...'
              : 'Tell us what you think, what you need, or what we could do better...'}
            rows={5}
            required
            maxLength={4000}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/30 resize-none"
          />
        </div>

        {/* Email (optional) */}
        <div>
          <label htmlFor="feedback-email" className="text-white text-sm font-medium block mb-2">
            Email <span className="text-slate-500 font-normal">(optional — only if you want a reply)</span>
          </label>
          <input
            id="feedback-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={200}
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/30"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm" role="alert">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!category || !details.trim() || submitting}
          className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? 'Sending...' : 'Submit Feedback'}
        </button>

        {/* Honest privacy line */}
        <p className="text-slate-500 text-xs leading-relaxed">
          We store what you write here (plus the page path, if you arrived from one) so we can fix issues
          and improve SpaceNexus. If you include an email it&apos;s used only to reply to this feedback —
          never for marketing, and never shared with third parties.
        </p>
      </form>

      {/* Alternative contact */}
      <div className="mt-8 text-center">
        <p className="text-slate-500 text-xs">
          You can also email us directly at{' '}
          <a href="mailto:owner@spacenexus.us" className="text-purple-400 hover:text-purple-300">owner@spacenexus.us</a>
          {' '}or{' '}
          <Link href="/contact" className="text-purple-400 hover:text-purple-300">use our contact form</Link>.
        </p>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Send Feedback"
          subtitle="Help us improve SpaceNexus"
          icon="💬"
          accentColor="purple"
        />
        <Suspense fallback={null}>
          <FeedbackForm />
        </Suspense>
      </div>
    </div>
  );
}
