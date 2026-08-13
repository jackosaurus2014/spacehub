'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';

const NEED_OPTIONS = [
  { value: 'feature_listings', label: 'Feature our job listings' },
  { value: 'post_jobs', label: "Help us get our jobs synced (we're not on Greenhouse/Lever/Ashby)" },
  { value: 'sponsorship', label: 'Employer branding / sponsorship' },
  { value: 'other', label: 'Something else' },
] as const;

type NeedValue = (typeof NEED_OPTIONS)[number]['value'];

interface FormState {
  name: string;
  email: string;
  company: string;
  need: NeedValue | '';
  details: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  company?: string;
  need?: string;
}

const NEED_LABELS: Record<NeedValue, string> = Object.fromEntries(
  NEED_OPTIONS.map((o) => [o.value, o.label])
) as Record<NeedValue, string>;

export default function HireInterestForm() {
  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
    company: '',
    need: '',
    details: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Work email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.company.trim()) newErrors.company = 'Company is required';
    if (!formData.need) newErrors.need = 'Please select what you need';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('submitting');
    setErrorMessage('');

    const needLabel = formData.need ? NEED_LABELS[formData.need] : 'Not specified';
    const message = [
      `Company: ${formData.company}`,
      `What they need: ${needLabel}`,
      '',
      formData.details.trim() || 'No additional details provided.',
    ].join('\n');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: 'employer-interest',
          message,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(extractApiError(data, 'Failed to submit request'));
      }

      setStatus('success');
      toast.success("Thanks — we'll be in touch.");
      setFormData({ name: '', email: '', company: '', need: '', details: '' });
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
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  if (status === 'success') {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Request received</h3>
        <p className="text-slate-400 mb-6">
          Thanks for your interest. Our team will follow up by email within 1-2 business days.
        </p>
        <button onClick={() => setStatus('idle')} className="btn-primary">
          Send Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {status === 'error' && (
          <div role="alert" className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="hire-name" className="block text-slate-400 text-sm mb-2">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="hire-name"
              name="name"
              type="text"
              autoComplete="name"
              enterKeyHint="next"
              value={formData.name}
              onChange={handleChange}
              className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Your name"
              aria-required="true"
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="hire-email" className="block text-slate-400 text-sm mb-2">
              Work Email <span className="text-red-400">*</span>
            </label>
            <input
              id="hire-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="next"
              value={formData.email}
              onChange={handleChange}
              className={`input w-full ${errors.email ? 'border-red-500' : ''}`}
              placeholder="you@company.com"
              aria-required="true"
              aria-invalid={errors.email ? true : undefined}
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="hire-company" className="block text-slate-400 text-sm mb-2">
            Company <span className="text-red-400">*</span>
          </label>
          <input
            id="hire-company"
            name="company"
            type="text"
            autoComplete="organization"
            enterKeyHint="next"
            value={formData.company}
            onChange={handleChange}
            className={`input w-full ${errors.company ? 'border-red-500' : ''}`}
            placeholder="Your company"
            aria-required="true"
            aria-invalid={errors.company ? true : undefined}
          />
          {errors.company && <p className="text-red-400 text-sm mt-1">{errors.company}</p>}
        </div>

        <div>
          <label htmlFor="hire-need" className="block text-slate-400 text-sm mb-2">
            What do you need? <span className="text-red-400">*</span>
          </label>
          <select
            id="hire-need"
            name="need"
            value={formData.need}
            onChange={handleChange}
            className={`input w-full ${errors.need ? 'border-red-500' : ''}`}
            aria-required="true"
            aria-invalid={errors.need ? true : undefined}
          >
            <option value="">Select one…</option>
            {NEED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.need && <p className="text-red-400 text-sm mt-1">{errors.need}</p>}
        </div>

        <div>
          <label htmlFor="hire-details" className="block text-slate-400 text-sm mb-2">
            Additional details (optional)
          </label>
          <textarea
            id="hire-details"
            name="details"
            value={formData.details}
            onChange={handleChange}
            rows={4}
            className="input w-full resize-none"
            placeholder="Tell us about your hiring needs, ATS provider, or timeline..."
          />
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
            'Get in touch'
          )}
        </button>
      </form>
    </div>
  );
}
