'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';

interface IntroductionRequestButtonProps {
  targetUserId?: string;
  targetCompanyId?: string;
  targetName: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}

const REASONS = [
  { value: '', label: 'Select a reason (optional)' },
  { value: 'investment_opportunity', label: 'Investment opportunity' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'hiring', label: 'Hiring' },
  { value: 'advice', label: 'Advice' },
  { value: 'other', label: 'Other' },
];

const MIN_LEN = 200;
const MAX_LEN = 800;

export default function IntroductionRequestButton({
  targetUserId,
  targetCompanyId,
  targetName,
  variant = 'secondary',
  className = '',
}: IntroductionRequestButtonProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const isAuthed = sessionStatus === 'authenticated' && !!session?.user?.id;

  const baseBtn =
    'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors';
  const primaryCls = 'bg-white text-black hover:bg-slate-100';
  const secondaryCls =
    'bg-white/[0.08] text-white hover:bg-white/[0.12] border border-white/[0.08]';
  const btnCls = `${baseBtn} ${variant === 'primary' ? primaryCls : secondaryCls} ${className}`;

  if (!isAuthed) {
    return (
      <Link
        href={`/login?returnTo=${encodeURIComponent(
          typeof window !== 'undefined' ? window.location.pathname : '/'
        )}`}
        className={btnCls}
        aria-label="Sign in to request an introduction"
      >
        Sign in to request intro
      </Link>
    );
  }

  const length = message.trim().length;
  const canSubmit = length >= MIN_LEN && length <= MAX_LEN && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/introductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(targetUserId ? { targetUserId } : {}),
          ...(targetCompanyId ? { targetCompanyId } : {}),
          message: message.trim(),
          ...(reason ? { reason } : {}),
        }),
      });

      if (res.ok) {
        toast.success(`Introduction request sent to ${targetName}`);
        setOpen(false);
        setMessage('');
        setReason('');
      } else {
        const err = await res.json().catch(() => ({}));
        const msg =
          err?.error?.message ||
          (typeof err?.error === 'string' ? err.error : null) ||
          'Failed to send introduction request';
        toast.error(msg);
      }
    } catch {
      toast.error('Failed to send introduction request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={btnCls}
        aria-label={`Request introduction to ${targetName}`}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Request Intro
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intro-modal-title"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-black border border-white/[0.12] rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3
                  id="intro-modal-title"
                  className="text-lg font-semibold text-white"
                >
                  Request introduction
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  To: <span className="text-white">{targetName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="intro-reason" className="block text-xs font-medium text-slate-300 mb-1">
                  Reason
                </label>
                <select
                  id="intro-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value} className="bg-black text-white">
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="intro-message" className="block text-xs font-medium text-slate-300 mb-1">
                  Message <span className="text-slate-500">({MIN_LEN}–{MAX_LEN} characters)</span>
                </label>
                <textarea
                  id="intro-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN + 50))}
                  rows={6}
                  disabled={submitting}
                  placeholder="Share context — who you are, why you'd like to connect, and what you're hoping to discuss."
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 resize-y min-h-[140px]"
                />
                <div
                  className={`text-xs mt-1 ${
                    length < MIN_LEN || length > MAX_LEN ? 'text-red-400' : 'text-slate-500'
                  }`}
                >
                  {length} / {MAX_LEN}
                  {length < MIN_LEN && ` — ${MIN_LEN - length} more needed`}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-black hover:bg-slate-100 transition-colors disabled:bg-white/[0.1] disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
