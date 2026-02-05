'use client';

import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface CompanyRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CompanyRequestDialog({ isOpen, onClose }: CompanyRequestDialogProps) {
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/companies/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          description,
          website: website || null,
          submitterEmail: email || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCompanyName('');
    setDescription('');
    setWebsite('');
    setEmail('');
    setSubmitted(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-space-800 border border-space-600 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-space-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Request Company Addition</h2>
            <p className="text-star-400 text-sm mt-1">
              Help us expand our database
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-star-400 hover:text-white transition-colors p-2"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Request Submitted!</h3>
              <p className="text-star-300 text-sm mb-6">
                Thank you for helping us expand our database. We&apos;ll review your request and add the company if it meets our criteria.
              </p>
              <button
                onClick={handleClose}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="companyName" className="block text-star-200 text-sm font-medium mb-2">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="input"
                  placeholder="e.g., Acme Space Technologies"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-star-200 text-sm font-medium mb-2">
                  Company Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="input resize-none"
                  placeholder="Describe what the company does in the space industry (e.g., develops reusable launch vehicles, builds satellite components, etc.)"
                />
                <p className="text-star-400 text-xs mt-1">
                  Please include relevant details about their space industry focus
                </p>
              </div>

              <div>
                <label htmlFor="website" className="block text-star-200 text-sm font-medium mb-2">
                  Company Website
                </label>
                <input
                  type="url"
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="input"
                  placeholder="https://www.example.com"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-star-200 text-sm font-medium mb-2">
                  Your Email <span className="text-star-400 text-xs font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="your@email.com"
                />
                <p className="text-star-400 text-xs mt-1">
                  We&apos;ll notify you when the company is added
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !companyName.trim() || !description.trim()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
