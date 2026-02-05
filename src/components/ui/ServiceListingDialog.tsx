'use client';

import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { ORBITAL_SERVICE_CATEGORIES } from '@/types';

interface ServiceListingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ServiceListingDialog({ isOpen, onClose }: ServiceListingDialogProps) {
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [category, setCategory] = useState('');
  const [pricingDetails, setPricingDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/orbital-services/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyWebsite: companyWebsite || null,
          contactEmail,
          serviceName,
          serviceDescription,
          category: category || null,
          pricingDetails,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit listing request');
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
    setCompanyWebsite('');
    setContactEmail('');
    setServiceName('');
    setServiceDescription('');
    setCategory('');
    setPricingDetails('');
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
            <h2 className="text-xl font-semibold text-white">List Your Service</h2>
            <p className="text-star-400 text-sm mt-1">
              Get your orbital service listed in our marketplace
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
                Thank you for your interest in listing your service. We&apos;ll review your submission and get back to you soon.
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
                  placeholder="e.g., Acme Orbital Services"
                />
              </div>

              <div>
                <label htmlFor="companyWebsite" className="block text-star-200 text-sm font-medium mb-2">
                  Company Website
                </label>
                <input
                  type="url"
                  id="companyWebsite"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  className="input"
                  placeholder="https://www.example.com"
                />
              </div>

              <div>
                <label htmlFor="contactEmail" className="block text-star-200 text-sm font-medium mb-2">
                  Contact Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  id="contactEmail"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  className="input"
                  placeholder="contact@example.com"
                />
                <p className="text-star-400 text-xs mt-1">
                  This email will be shared with potential customers
                </p>
              </div>

              <div>
                <label htmlFor="serviceName" className="block text-star-200 text-sm font-medium mb-2">
                  Service Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="serviceName"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                  className="input"
                  placeholder="e.g., High-Resolution SAR Imaging"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-star-200 text-sm font-medium mb-2">
                  Service Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input"
                >
                  <option value="">Select a category...</option>
                  {ORBITAL_SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="serviceDescription" className="block text-star-200 text-sm font-medium mb-2">
                  Service Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="serviceDescription"
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  required
                  rows={3}
                  className="input resize-none"
                  placeholder="Describe your service, capabilities, coverage, and any unique features..."
                />
              </div>

              <div>
                <label htmlFor="pricingDetails" className="block text-star-200 text-sm font-medium mb-2">
                  Pricing Details <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="pricingDetails"
                  value={pricingDetails}
                  onChange={(e) => setPricingDetails(e.target.value)}
                  required
                  rows={3}
                  className="input resize-none"
                  placeholder="e.g., $10-15/km² for standard imagery, volume discounts available for orders over 1000 km²..."
                />
                <p className="text-star-400 text-xs mt-1">
                  Include pricing model, rates, minimums, and any discount tiers
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
                  disabled={submitting || !companyName.trim() || !contactEmail.trim() || !serviceName.trim() || !serviceDescription.trim() || !pricingDetails.trim()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Listing Request'
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
