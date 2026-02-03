'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal';

interface HelpRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpRequestModal({ isOpen, onClose }: HelpRequestModalProps) {
  const { data: session } = useSession();
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setSubject('');
    setDetails('');
    setEmail('');
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/help-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          details,
          email: session?.user?.email || email,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Help!">
      {success ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Help Request Sent!</h3>
          <p className="text-star-300 mb-6">We&apos;ll get back to you as soon as possible.</p>
          <button onClick={handleClose} className="btn-primary py-2 px-6">
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (anonymous users only) */}
          {!session && (
            <div>
              <label htmlFor="help-email" className="block text-sm text-star-200 mb-2">Your Email</label>
              <input
                id="help-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="input w-full"
              />
            </div>
          )}

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm text-star-200 mb-2">Subject</label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="What do you need help with?"
              className="input w-full"
            />
          </div>

          {/* Details */}
          <div>
            <label htmlFor="help-details" className="block text-sm text-star-200 mb-2">Details</label>
            <textarea
              id="help-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
              rows={4}
              placeholder="Please describe your issue or question in detail..."
              className="input w-full resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending...' : 'Send Help Request'}
          </button>
        </form>
      )}
    </Modal>
  );
}
