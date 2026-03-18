'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';

const showingCards = [
  {
    icon: (
      <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    title: 'Real-time Satellite Tracking',
    description: 'Live 3D visualization tracking 19,000+ objects in orbit. Monitor ISS, Starlink, debris fields, and more with real-time TLE data.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Market Intelligence Dashboard',
    description: 'Comprehensive space economy analytics covering funding rounds, M&A activity, company profiles, and sector-level market sizing.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: 'Government Contract Intelligence',
    description: 'Track SAM.gov contract awards, SBIR/STTR grants, and procurement opportunities across NASA, DoD, and Space Force programs.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    title: 'Embeddable Widgets',
    description: 'Drop SpaceNexus intelligence modules directly into your website or application with our embeddable widget library and REST API.',
  },
];

interface MeetingFormData {
  name: string;
  email: string;
  company: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  company?: string;
  message?: string;
}

export default function Satellite2026Page() {
  const [formData, setFormData] = useState<MeetingFormData>({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.company.trim()) newErrors.company = 'Company is required';
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: 'SATELLITE 2026 Meeting',
          message: `Company: ${formData.company}\n\n${formData.message}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(extractApiError(data, 'Failed to submit meeting request'));
      }

      setStatus('success');
      toast.success('Meeting request sent! We will confirm your time slot.');
      setFormData({ name: '', email: '', company: '', message: '' });
    } catch (error) {
      setStatus('error');
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <AnimatedPageHeader
          title="SpaceNexus at SATELLITE 2026"
          subtitle="March 23-26, 2026 | Walter E. Washington Convention Center, Washington DC"
          accentColor="cyan"
        />

        <ScrollReveal className="mt-4 mb-16">
          <p className="text-center text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Meet the SpaceNexus team and see the future of space industry intelligence.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-all duration-200 shadow-lg shadow-white/[0.05]"
            >
              Create Free Account
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/[0.12] text-white font-semibold rounded-lg hover:bg-white/[0.06] transition-all duration-200"
            >
              View Pricing
            </Link>
          </div>
        </ScrollReveal>

        {/* What We're Showing */}
        <ScrollReveal className="mb-16">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-8 text-center">
            What We&apos;re Showing
          </h2>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16" staggerDelay={0.12}>
          {showingCards.map((card) => (
            <StaggerItem key={card.title}>
              <div className="card p-6 h-full">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
                    <p className="text-slate-300 leading-relaxed">{card.description}</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Schedule a Meeting */}
        <ScrollReveal className="mb-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 text-center">
              Schedule a Meeting
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Book time with our team at SATELLITE 2026. We&apos;ll walk you through the platform and discuss how SpaceNexus can support your mission.
            </p>

            {status === 'success' ? (
              <div className="card p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Meeting Request Sent!</h3>
                <p className="text-slate-400 mb-6">
                  Thank you for your interest. We&apos;ll confirm your meeting time within 24 hours.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="btn-primary"
                >
                  Schedule Another Meeting
                </button>
              </div>
            ) : (
              <div className="card p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {status === 'error' && (
                    <div role="alert" className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                      {errorMessage}
                    </div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-slate-400 text-sm mb-2">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      enterKeyHint="next"
                      maxLength={200}
                      value={formData.name}
                      onChange={handleChange}
                      className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="Your name"
                      aria-required="true"
                      aria-invalid={errors.name ? true : undefined}
                      aria-describedby={errors.name ? 'sat-name-error' : undefined}
                    />
                    {errors.name && <p id="sat-name-error" role="alert" className="text-red-400 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-slate-400 text-sm mb-2">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      enterKeyHint="next"
                      maxLength={320}
                      value={formData.email}
                      onChange={handleChange}
                      className={`input w-full ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="you@company.com"
                      aria-required="true"
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={errors.email ? 'sat-email-error' : undefined}
                    />
                    {errors.email && <p id="sat-email-error" role="alert" className="text-red-400 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-slate-400 text-sm mb-2">
                      Company <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      autoComplete="organization"
                      enterKeyHint="next"
                      maxLength={200}
                      value={formData.company}
                      onChange={handleChange}
                      className={`input w-full ${errors.company ? 'border-red-500' : ''}`}
                      placeholder="Your company"
                      aria-required="true"
                      aria-invalid={errors.company ? true : undefined}
                      aria-describedby={errors.company ? 'sat-company-error' : undefined}
                    />
                    {errors.company && <p id="sat-company-error" role="alert" className="text-red-400 text-sm mt-1">{errors.company}</p>}
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-slate-400 text-sm mb-2">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      maxLength={2000}
                      className={`input w-full resize-none ${errors.message ? 'border-red-500' : ''}`}
                      placeholder="What topics would you like to discuss? Any specific features you'd like to see?"
                      aria-required="true"
                      aria-invalid={errors.message ? true : undefined}
                      aria-describedby={errors.message ? 'sat-message-error' : undefined}
                    />
                    {errors.message && <p id="sat-message-error" role="alert" className="text-red-400 text-sm mt-1">{errors.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'submitting' ? (
                      <span className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </span>
                    ) : (
                      'Request a Meeting'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Conference Special */}
        <ScrollReveal className="mb-16">
          <div className="card p-8 md:p-12 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.05] to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
                  Conference Special
                </h2>
              </div>
              <p className="text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
                Sign up at SATELLITE 2026 and get 3 months of Professional free. Use code{' '}
                <span className="inline-block bg-cyan-500/20 text-cyan-300 font-mono font-bold px-3 py-1 rounded-md border border-cyan-500/30">
                  SATELLITE2026
                </span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-all duration-200 shadow-lg shadow-white/[0.05]"
                >
                  Sign Up Now
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/[0.12] text-white font-semibold rounded-lg hover:bg-white/[0.06] transition-all duration-200"
                >
                  Compare Plans
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Live Conference Coverage */}
        <ScrollReveal className="mb-16">
          <div className="card p-8 md:p-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <div className="relative">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
                Live Conference Coverage
              </h2>
            </div>
            <p className="text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              Follow our live coverage on the SpaceNexus blog. We&apos;ll be publishing real-time insights,
              interviews, and analysis from the show floor throughout SATELLITE 2026.
            </p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/[0.12] text-white font-semibold rounded-lg hover:bg-white/[0.06] transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
              </svg>
              Read the Blog
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
