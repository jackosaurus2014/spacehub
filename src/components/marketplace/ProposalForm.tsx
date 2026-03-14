'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';

interface ProposalFormProps {
  rfqId: string;
  onSuccess?: (proposal: any) => void;
}

export default function ProposalForm({ rfqId, onSuccess }: ProposalFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    price: '',
    timeline: '',
    approach: '',
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfqId,
          price: form.price ? parseFloat(form.price) : undefined,
          timeline: form.timeline || undefined,
          approach: form.approach,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit proposal');
      }

      const data = await res.json();
      toast.success('Proposal submitted successfully!');
      onSuccess?.(data.proposal);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Submit Your Proposal</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Proposed Price ($) <span className="text-slate-600 text-xs">optional</span></label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={form.price}
            onChange={(e) => updateField('price', e.target.value)}
            placeholder="e.g., 50000"
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Timeline <span className="text-slate-600 text-xs">optional</span></label>
          <input
            type="text"
            value={form.timeline}
            onChange={(e) => updateField('timeline', e.target.value)}
            placeholder="e.g., 6-8 weeks"
            className="w-full bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Your Approach <span className="text-red-400">*</span></label>
        <textarea
          value={form.approach}
          onChange={(e) => updateField('approach', e.target.value)}
          rows={5}
          required
          minLength={50}
          maxLength={10000}
          placeholder="Describe your approach, qualifications, relevant experience, and why you're the right provider for this RFQ..."
          className="w-full bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !form.approach}
        className="w-full py-2.5 bg-gradient-to-r from-slate-200 to-blue-600 hover:from-white hover:to-blue-500 disabled:from-white/[0.08] disabled:to-white/[0.08] text-white rounded-lg font-semibold transition-all"
      >
        {submitting ? 'Submitting...' : 'Submit Proposal'}
      </button>
    </form>
  );
}
