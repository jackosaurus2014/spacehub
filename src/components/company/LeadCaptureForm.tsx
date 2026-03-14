'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';

interface LeadCaptureFormProps {
  companySlug: string;
  companyName: string;
}

export default function LeadCaptureForm({ companySlug, companyName }: LeadCaptureFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/company-profiles/${companySlug}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit');
      }

      setSubmitted(true);
      toast.success('Your inquiry has been sent!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
        <svg className="w-12 h-12 mx-auto text-emerald-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-emerald-300 mb-1">Inquiry Sent!</h3>
        <p className="text-sm text-slate-400">
          {companyName} will receive your message and respond directly.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.05] border border-white/[0.06] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-1">Contact {companyName}</h3>
      <p className="text-sm text-slate-400 mb-4">
        Send an inquiry directly to this company. They will respond via email.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="lead-name" className="block text-sm text-slate-400 mb-1">Your Name *</label>
            <input
              id="lead-name"
              type="text"
              required
              maxLength={100}
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              autoComplete="name"
              enterKeyHint="next"
              className="w-full bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label htmlFor="lead-email" className="block text-sm text-slate-400 mb-1">Email *</label>
            <input
              id="lead-email"
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              enterKeyHint="next"
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
              placeholder="jane@company.com"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="lead-company" className="block text-sm text-slate-400 mb-1">Company</label>
            <input
              id="lead-company"
              type="text"
              maxLength={100}
              autoComplete="organization"
              enterKeyHint="next"
              value={formData.company}
              onChange={(e) => setFormData((f) => ({ ...f, company: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label htmlFor="lead-phone" className="block text-sm text-slate-400 mb-1">Phone</label>
            <input
              id="lead-phone"
              type="tel"
              autoComplete="tel"
              enterKeyHint="next"
              value={formData.phone}
              onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
              className="w-full bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
        <div>
          <label htmlFor="lead-message" className="block text-sm text-slate-400 mb-1">Message *</label>
          <textarea
            id="lead-message"
            required
            rows={4}
            minLength={10}
            maxLength={5000}
            value={formData.message}
            onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))}
            className="w-full bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none resize-none"
            placeholder="Tell them about your interest or requirements..."
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-white to-blue-500 text-white font-semibold rounded-lg hover:from-slate-300 hover:to-blue-400 disabled:opacity-60 transition-all text-sm"
        >
          {submitting ? 'Sending...' : 'Send Inquiry'}
        </button>
      </form>
    </div>
  );
}
