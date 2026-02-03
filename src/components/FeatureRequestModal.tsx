'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal';
import { AVAILABLE_MODULES } from '@/types';

interface FeatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeatureRequestModal({ isOpen, onClose }: FeatureRequestModalProps) {
  const { data: session } = useSession();
  const [type, setType] = useState<'existing_module' | 'new_module'>('existing_module');
  const [module, setModule] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setType('existing_module');
    setModule('');
    setTitle('');
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
      const res = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          module: type === 'existing_module' ? module : null,
          title,
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Feature Request">
      {success ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Request Submitted!</h3>
          <p className="text-star-300 mb-6">Thank you for your feedback. We&apos;ll review your request.</p>
          <button onClick={handleClose} className="btn-primary py-2 px-6">
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div>
            <label className="block text-sm text-star-200 mb-2">Request Type</label>
            <div className="flex rounded-lg overflow-hidden border border-space-600/50">
              <button
                type="button"
                onClick={() => setType('existing_module')}
                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                  type === 'existing_module'
                    ? 'bg-nebula-500/30 text-white'
                    : 'bg-space-800 text-star-300 hover:text-white'
                }`}
              >
                Existing Module
              </button>
              <button
                type="button"
                onClick={() => setType('new_module')}
                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                  type === 'new_module'
                    ? 'bg-nebula-500/30 text-white'
                    : 'bg-space-800 text-star-300 hover:text-white'
                }`}
              >
                New Module
              </button>
            </div>
          </div>

          {/* Module Dropdown (existing only) */}
          {type === 'existing_module' && (
            <div>
              <label htmlFor="module" className="block text-sm text-star-200 mb-2">Module</label>
              <select
                id="module"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                required
                className="input w-full"
              >
                <option value="">Select a module...</option>
                {AVAILABLE_MODULES.map((m) => (
                  <option key={m.moduleId} value={m.moduleId}>
                    {m.icon} {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm text-star-200 mb-2">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Brief description of your request"
              className="input w-full"
            />
          </div>

          {/* Details */}
          <div>
            <label htmlFor="details" className="block text-sm text-star-200 mb-2">Details</label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
              rows={4}
              placeholder="Describe the feature you'd like to see..."
              className="input w-full resize-none"
            />
          </div>

          {/* Email (anonymous users only) */}
          {!session && (
            <div>
              <label htmlFor="email" className="block text-sm text-star-200 mb-2">Your Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="input w-full"
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      )}
    </Modal>
  );
}
