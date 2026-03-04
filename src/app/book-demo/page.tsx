'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import RelatedModules from '@/components/ui/RelatedModules';
import { getRelatedModules } from '@/lib/module-relationships';
import StickyMobileCTA from '@/components/mobile/StickyMobileCTA';

interface DemoFormData {
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  teamSize: string;
  interest: string;
  message: string;
  subject: string;
}

const TEAM_SIZES = ['1-5', '6-20', '21-50', '50+'];

const INTERESTS = [
  'Market Intelligence',
  'Satellite Tracking',
  'Investment Research',
  'Compliance & Regulatory',
  'Government Contracting',
  'Other',
];

const BENEFITS = [
  {
    icon: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    text: 'Personalized walkthrough of relevant features',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    text: 'See how SpaceNexus fits your workflow',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    text: 'Get answers from our space industry experts',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    text: 'No commitment required',
  },
];

export default function BookDemoPage() {
  const [formData, setFormData] = useState<DemoFormData>({
    name: '',
    email: '',
    company: '',
    jobTitle: '',
    teamSize: '',
    interest: '',
    message: '',
    subject: 'demo',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleStickySubmit = useCallback(() => {
    const btn = document.getElementById('demo-submit-btn');
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => btn.click(), 400);
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.company.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        subject: 'demo',
        message: [
          `Company: ${formData.company}`,
          formData.jobTitle ? `Job Title: ${formData.jobTitle}` : '',
          formData.teamSize ? `Team Size: ${formData.teamSize}` : '',
          formData.interest ? `Primary Interest: ${formData.interest}` : '',
          formData.message ? `\nMessage: ${formData.message}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      };

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractApiError(data, 'Something went wrong'));
      }

      setStatus('success');
      toast.success('Demo request submitted successfully!');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
      toast.error('Failed to submit demo request.');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen pb-16">
        <section className="relative py-20 md:py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-600/10 pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-lg mx-auto text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Demo Request Received!
              </h1>
              <p className="text-slate-300 text-lg mb-8">
                We&apos;ll be in touch within 24 hours to schedule your personalized walkthrough of SpaceNexus.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                >
                  Explore Pricing
                </Link>
                <Link
                  href="/case-studies"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 text-slate-200 font-semibold hover:bg-slate-800/50 transition-colors"
                >
                  Read Case Studies
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const inputClass =
    'w-full bg-slate-800/80 border border-slate-600 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 px-4 py-3 text-sm transition-colors';
  const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5';

  return (
    <div className="min-h-screen pb-16">
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-600/10 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mb-6">
                Request a Demo
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                See SpaceNexus{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  in Action
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
                Schedule a personalized demo and discover how SpaceNexus can accelerate your team&apos;s research and decision-making.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Form + Benefits */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 max-w-5xl mx-auto">
            {/* Left: Form */}
            <ScrollReveal className="lg:col-span-3">
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-6 md:p-8 space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className={labelClass}>
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      autoComplete="name"
                      enterKeyHint="next"
                      placeholder="Jane Smith"
                      value={formData.name}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Work Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      autoComplete="email"
                      enterKeyHint="next"
                      inputMode="email"
                      placeholder="jane@company.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="company" className={labelClass}>
                      Company Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      required
                      autoComplete="organization"
                      enterKeyHint="next"
                      placeholder="Acme Aerospace"
                      value={formData.company}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="jobTitle" className={labelClass}>
                      Job Title
                    </label>
                    <input
                      type="text"
                      id="jobTitle"
                      name="jobTitle"
                      autoComplete="organization-title"
                      enterKeyHint="next"
                      placeholder="VP of Strategy"
                      value={formData.jobTitle}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="teamSize" className={labelClass}>
                      Team Size
                    </label>
                    <select
                      id="teamSize"
                      name="teamSize"
                      value={formData.teamSize}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Select team size</option>
                      {TEAM_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="interest" className={labelClass}>
                      Primary Interest
                    </label>
                    <select
                      id="interest"
                      name="interest"
                      value={formData.interest}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Select area of interest</option>
                      {INTERESTS.map((interest) => (
                        <option key={interest} value={interest}>
                          {interest}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className={labelClass}>
                    Message (optional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    // @ts-expect-error enterkeyhint is valid HTML global attr
                    enterkeyhint="send"
                    placeholder="Tell us about your team's needs or specific features you'd like to see..."
                    value={formData.message}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                {status === 'error' && errorMessage && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-red-300 text-sm">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  id="demo-submit-btn"
                  disabled={status === 'submitting'}
                  className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Request Demo
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </ScrollReveal>

            {/* Right: Benefits */}
            <ScrollReveal className="lg:col-span-2" delay={0.1}>
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-6 md:p-8">
                <h2 className="text-lg font-semibold text-white mb-6">What to expect</h2>
                <ul className="space-y-5">
                  {BENEFITS.map((benefit) => (
                    <li key={benefit.text} className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{benefit.icon}</div>
                      <p className="text-slate-300 text-sm leading-relaxed">{benefit.text}</p>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 pt-6 border-t border-slate-700/50">
                  <p className="text-slate-400 text-sm mb-3">
                    Or start exploring now
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                  >
                    View self-serve plans
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <RelatedModules modules={getRelatedModules('book-demo')} title="Explore SpaceNexus Modules" />
        </div>
      </section>

      <StickyMobileCTA
        label="Submit Demo Request"
        onClick={handleStickySubmit}
        variant="enterprise"
      />
    </div>
  );
}
