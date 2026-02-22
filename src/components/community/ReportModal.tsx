'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { toast } from '@/lib/toast';

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam or self-promotion',
  harassment: 'Harassment or bullying',
  itar_violation: 'Possible ITAR/EAR violation',
  copyright: 'Copyright infringement',
  inappropriate: 'Inappropriate content',
  hate_speech: 'Hate speech or discrimination',
  doxxing: 'Sharing private information',
  impersonation: 'Impersonation',
  other: 'Other',
};

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'thread' | 'post' | 'message' | 'profile';
  contentId: string;
}

export default function ReportModal({ isOpen, onClose, contentType, contentId }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/community/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, contentId, reason, description: description || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit report');
      }

      toast.success('Report submitted. Our team will review it shortly.');
      setReason('');
      setDescription('');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Content">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="report-reason" className="block text-sm font-medium text-slate-300 mb-2">
            Reason for report
          </label>
          <select
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            required
          >
            <option value="">Select a reason...</option>
            {Object.entries(REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {reason === 'itar_violation' && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-xs text-amber-300">
              ITAR/EAR violations are serious. If you believe someone has shared export-controlled
              technical data, please provide as much detail as possible. SpaceNexus may be required
              to report confirmed violations to the relevant authorities.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="report-description" className="block text-sm font-medium text-slate-300 mb-2">
            Additional details <span className="text-slate-500">(optional)</span>
          </label>
          <textarea
            id="report-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide any additional context..."
            rows={3}
            maxLength={2000}
            className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-2.5 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none"
          />
        </div>

        <p className="text-xs text-slate-500">
          Reports are confidential. False or malicious reports may result in action against your account.
        </p>

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !reason}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
