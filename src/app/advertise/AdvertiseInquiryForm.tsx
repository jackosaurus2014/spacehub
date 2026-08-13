'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';

interface ContactFormData {
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

export default function AdvertiseInquiryForm() {
  const [formData, setFormData] = useState<ContactFormData>({
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
          subject: 'sponsorship-inquiry',
          message: `Company: ${formData.company}\n\n${formData.message}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(extractApiError(data, 'Failed to submit inquiry'));
      }

      setStatus('success');
      toast.success('Inquiry sent! Our team will be in touch.');
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

  if (status === 'success') {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Inquiry Sent!</h3>
        <p className="text-slate-400 mb-6">
          Thank you for your interest. Our team will be in touch within 1-2 business days.
        </p>
        <button onClick={() => setStatus('idle')} className="btn-primary">
          Send Another Inquiry
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

        <div>
          <label htmlFor="adv-name" className="block text-slate-400 text-sm mb-2">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            id="adv-name"
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
          <label htmlFor="adv-email" className="block text-slate-400 text-sm mb-2">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            id="adv-email"
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

        <div>
          <label htmlFor="adv-company" className="block text-slate-400 text-sm mb-2">
            Company <span className="text-red-400">*</span>
          </label>
          <input
            id="adv-company"
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
          <label htmlFor="adv-message" className="block text-slate-400 text-sm mb-2">
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            id="adv-message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            className={`input w-full resize-none ${errors.message ? 'border-red-500' : ''}`}
            placeholder="Tell us what you'd like to sponsor and your goals..."
            aria-required="true"
            aria-invalid={errors.message ? true : undefined}
          />
          {errors.message && <p className="text-red-400 text-sm mt-1">{errors.message}</p>}
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
            'Send Inquiry'
          )}
        </button>
      </form>
    </div>
  );
}
