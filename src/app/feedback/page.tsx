'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';

const FEEDBACK_TYPES = [
  { id: 'bug', label: 'Bug Report', icon: '🐛', description: 'Something is broken or not working correctly' },
  { id: 'feature', label: 'Feature Request', icon: '💡', description: 'Suggest a new feature or improvement' },
  { id: 'data', label: 'Data Issue', icon: '📊', description: 'Incorrect or missing data on the platform' },
  { id: 'ui', label: 'UI/UX Feedback', icon: '🎨', description: 'Design, layout, or usability suggestions' },
  { id: 'game', label: 'Space Tycoon', icon: '🎮', description: 'Feedback about the Space Tycoon game' },
  { id: 'other', label: 'Other', icon: '💬', description: 'General feedback or questions' },
];

export default function FeedbackPage() {
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !message.trim()) return;

    setSubmitting(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: email || 'Anonymous',
          email: email || 'feedback@spacenexus.us',
          subject: `[${type.toUpperCase()}] Feedback from SpaceNexus`,
          message: message.trim(),
          source: 'feedback-page',
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // Show success even on error (best effort)
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-space-900">
        <div className="container mx-auto px-4 pb-16">
          <div className="max-w-2xl mx-auto text-center py-20">
            <span className="text-5xl block mb-4">✅</span>
            <h1 className="text-3xl font-bold text-white mb-3">Thank You!</h1>
            <p className="text-slate-400 mb-8">Your feedback has been submitted. We review every submission and use it to improve SpaceNexus.</p>
            <Link href="/" className="px-6 py-3 text-sm font-medium text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Send Feedback"
          subtitle="Help us improve SpaceNexus"
          icon="💬"
          accentColor="purple"
        />

        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback Type */}
            <div>
              <label className="text-white text-sm font-medium block mb-3">What kind of feedback?</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FEEDBACK_TYPES.map(ft => (
                  <button
                    key={ft.id}
                    type="button"
                    onClick={() => setType(ft.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      type === ft.id
                        ? 'border-purple-500/30 bg-purple-500/10'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                    }`}
                  >
                    <span className="text-lg block mb-1">{ft.icon}</span>
                    <span className="text-white text-xs font-medium block">{ft.label}</span>
                    <span className="text-slate-500 text-[10px] block">{ft.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="feedback-message" className="text-white text-sm font-medium block mb-2">Your feedback</label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us what you think, what's broken, or what you'd like to see..."
                rows={5}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/30 resize-none"
              />
            </div>

            {/* Email (optional) */}
            <div>
              <label htmlFor="feedback-email" className="text-white text-sm font-medium block mb-2">
                Email <span className="text-slate-500 font-normal">(optional — if you want a response)</span>
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/30"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!type || !message.trim() || submitting}
              className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? 'Sending...' : 'Submit Feedback'}
            </button>
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
      </div>
    </div>
  );
}
