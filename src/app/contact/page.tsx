'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import StickyMobileCTA from '@/components/mobile/StickyMobileCTA';

type SubjectType = 'general' | 'technical' | 'billing' | 'partnership';

interface FormData {
  name: string;
  email: string;
  subject: SubjectType;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

function getFieldError(field: string, value: string): string | null {
  switch (field) {
    case 'name':
      if (!value.trim()) return 'Name is required';
      return null;
    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
      return null;
    case 'subject':
      if (!value) return 'Please select a subject';
      return null;
    case 'message':
      if (!value.trim()) return 'Message is required';
      if (value.trim().length < 10) return 'Message must be at least 10 characters';
      return null;
    default:
      return null;
  }
}

function StoryForm() {
  const [storyData, setStoryData] = useState({ name: '', company: '', story: '' });
  const [storyStatus, setStoryStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyData.name.trim() || !storyData.story.trim()) return;

    setStoryStatus('submitting');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storyData.name,
          email: `${storyData.name.toLowerCase().replace(/\s+/g, '.')}@story-submission.spacenexus.us`,
          subject: 'partnership',
          message: `[User Story Submission]\n\nName: ${storyData.name}\nCompany: ${storyData.company || 'Not specified'}\n\nHow they use SpaceNexus:\n${storyData.story}`,
        }),
      });
      if (!response.ok) throw new Error('Failed to submit');
      setStoryStatus('success');
      toast.success('Thank you for sharing your story!');
      setStoryData({ name: '', company: '', story: '' });
    } catch {
      setStoryStatus('error');
      toast.error('Failed to submit your story. Please try again.');
    }
  };

  if (storyStatus === 'success') {
    return (
      <div className="text-center py-4" aria-live="polite">
        <p className="text-emerald-400 font-medium mb-2">Thank you for sharing your story!</p>
        <button
          onClick={() => setStoryStatus('idle')}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Submit another story
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleStorySubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="story-name" className="block text-slate-400 text-sm mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            id="story-name"
            type="text"
            value={storyData.name}
            onChange={(e) => setStoryData((prev) => ({ ...prev, name: e.target.value }))}
            className="input"
            placeholder="Your name"
            maxLength={200}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="story-company" className="block text-slate-400 text-sm mb-1">
            Company
          </label>
          <input
            id="story-company"
            type="text"
            value={storyData.company}
            onChange={(e) => setStoryData((prev) => ({ ...prev, company: e.target.value }))}
            className="input"
            placeholder="Your company (optional)"
            maxLength={200}
          />
        </div>
      </div>
      <div>
        <label htmlFor="story-usage" className="block text-slate-400 text-sm mb-1">
          How do you use SpaceNexus? <span className="text-red-400">*</span>
        </label>
        <textarea
          id="story-usage"
          value={storyData.story}
          onChange={(e) => setStoryData((prev) => ({ ...prev, story: e.target.value }))}
          rows={3}
          maxLength={2000}
          className="input resize-none"
          placeholder="Tell us how SpaceNexus helps with your space industry work..."
          required
          aria-required="true"
        />
      </div>
      <button
        type="submit"
        disabled={storyStatus === 'submitting'}
        className="btn-primary w-full py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {storyStatus === 'submitting' ? 'Submitting...' : 'Share Your Story'}
      </button>
      {storyStatus === 'error' && (
        <p role="alert" aria-live="polite" className="text-red-400 text-xs text-center">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    // Validate the single field on blur and merge into errors
    const newError = getFieldError(field, formData[field as keyof FormData]);
    setErrors(prev => {
      const updated = { ...prev };
      if (newError) {
        (updated as Record<string, string>)[field] = newError;
      } else {
        delete (updated as Record<string, string | undefined>)[field];
      }
      return updated;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject) {
      newErrors.subject = 'Please select a subject';
    }

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractApiError(data, 'Failed to submit contact form'));
      }

      setStatus('success');
      toast.success('Message sent! We will get back to you soon.');
      setFormData({
        name: '',
        email: '',
        subject: 'general',
        message: '',
      });
      setTouched({});
    } catch (error) {
      setStatus('error');
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const subjectOptions: { value: SubjectType; label: string }[] = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'partnership', label: 'Partnership Opportunity' },
  ];

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Contact Us"
          subtitle="Have questions or feedback? We'd love to hear from you."
          icon="📧"
          accentColor="cyan"
        >
          <Link href="/faq" className="btn-secondary text-sm py-2 px-4">
            View FAQ
          </Link>
        </AnimatedPageHeader>

        <ScrollReveal><div className="max-w-2xl mx-auto">
          {status === 'success' ? (
            <div className="card p-8 text-center" aria-live="polite">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Message Sent!</h2>
              <p className="text-slate-400 mb-6">
                Thank you for reaching out. We&apos;ll get back to you as soon as possible.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="btn-primary"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <div className="card p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {status === 'error' && (
                  <div role="alert" aria-live="polite" className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
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
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() => handleBlur('name')}
                    className={`input ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Your name"
                    aria-required="true"
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" aria-live="polite" className="text-red-400 text-sm mt-1">{errors.name}</p>
                  )}
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
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => handleBlur('email')}
                    className={`input ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="you@example.com"
                    aria-required="true"
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" aria-live="polite" className="text-red-400 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="subject" className="block text-slate-400 text-sm mb-2">
                    Subject <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    onBlur={() => handleBlur('subject')}
                    className={`input ${errors.subject ? 'border-red-500' : ''}`}
                    aria-required="true"
                    aria-invalid={errors.subject ? true : undefined}
                    aria-describedby={errors.subject ? 'subject-error' : undefined}
                  >
                    {subjectOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.subject && (
                    <p id="subject-error" aria-live="polite" className="text-red-400 text-sm mt-1">{errors.subject}</p>
                  )}
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
                    onBlur={() => handleBlur('message')}
                    rows={4}
                    // @ts-expect-error enterkeyhint is valid HTML global attr
                    enterkeyhint="send"
                    className={`input resize-none ${errors.message ? 'border-red-500' : ''}`}
                    placeholder="How can we help you?"
                    aria-required="true"
                    aria-invalid={errors.message ? true : undefined}
                    aria-describedby={errors.message ? 'message-error' : undefined}
                  />
                  {errors.message && (
                    <p id="message-error" aria-live="polite" className="text-red-400 text-sm mt-1">{errors.message}</p>
                  )}
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
                    'Send Message'
                  )}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-white/[0.06]">
                <h3 className="text-lg font-semibold text-white mb-4">Other Ways to Reach Us</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-white/70"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Email</p>
                      <a
                        href="mailto:support@spacenexus.us"
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        support@spacenexus.us
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-white/70"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Help Center</p>
                      <Link
                        href="/faq"
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        Browse FAQ
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div></ScrollReveal>

        {/* Share Your Story Section */}
        <ScrollReveal>
          <div className="max-w-2xl mx-auto mt-12">
            <div className="card p-8 border border-white/[0.08]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Share Your SpaceNexus Story</h2>
                  <p className="text-sm text-slate-400">
                    Using SpaceNexus for your space industry work? We&apos;d love to hear about it.
                  </p>
                </div>
              </div>

              <StoryForm />

              <p className="text-xs text-slate-500 mt-4 text-center">
                Selected stories may be featured on our website.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>

      <StickyMobileCTA
        label="Send Message"
        href="#message"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
      />
    </div>
  );
}
