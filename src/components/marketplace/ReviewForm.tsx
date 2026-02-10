'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';

interface ReviewFormProps {
  companyId: string;
  rfqId?: string;
  onSuccess?: () => void;
}

function StarSelector({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-24">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`text-lg transition-colors ${
              star <= (hover || value) ? 'text-yellow-400' : 'text-slate-600'
            } hover:scale-110`}
          >
            ★
          </button>
        ))}
      </div>
      {value > 0 && <span className="text-xs text-slate-500">{value}/5</span>}
    </div>
  );
}

export default function ReviewForm({ companyId, rfqId, onSuccess }: ReviewFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [timelineRating, setTimelineRating] = useState(0);
  const [commRating, setCommRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overallRating === 0) {
      toast.error('Please select an overall rating');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/marketplace/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          rfqId: rfqId || undefined,
          overallRating,
          qualityRating: qualityRating || undefined,
          timelineRating: timelineRating || undefined,
          commRating: commRating || undefined,
          valueRating: valueRating || undefined,
          title: title || undefined,
          content: content || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit review');
      }

      toast.success('Review submitted successfully!');
      setOverallRating(0);
      setQualityRating(0);
      setTimelineRating(0);
      setCommRating(0);
      setValueRating(0);
      setTitle('');
      setContent('');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <h3 className="text-lg font-semibold text-white">Write a Review</h3>

      <StarSelector value={overallRating} onChange={setOverallRating} label="Overall *" />

      <div className="border-t border-slate-700/50 pt-3 space-y-2">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Detailed Ratings (optional)</div>
        <StarSelector value={qualityRating} onChange={setQualityRating} label="Quality" />
        <StarSelector value={timelineRating} onChange={setTimelineRating} label="Timeline" />
        <StarSelector value={commRating} onChange={setCommRating} label="Communication" />
        <StarSelector value={valueRating} onChange={setValueRating} label="Value" />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">
          Review Title <span className="text-slate-600 text-[10px]">optional</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={200}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">
          Your Review <span className="text-slate-600 text-[10px]">optional</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share details about your experience working with this provider..."
          rows={4}
          maxLength={5000}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || overallRating === 0}
        className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg font-semibold transition-all"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
