'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';
import { MARKETPLACE_CATEGORIES } from '@/lib/marketplace-types';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const PRICING_TYPES = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Hourly Rate' },
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'rfq_only', label: 'RFQ / Contact for Pricing' },
];

export default function NewListingPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    pricingType: '',
    priceMin: '',
    priceMax: '',
    priceUnit: '',
    pricingNotes: '',
    leadTime: '',
    capacity: '',
    coverageArea: '',
    certifications: '' as string,
    pastPerformance: '',
  });

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login?returnTo=/provider-dashboard/new-listing');
    }
  }, [sessionStatus, router]);

  const subcategories = MARKETPLACE_CATEGORIES.find(c => c.value === selectedCategory)?.subcategories || [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'category') {
      setSelectedCategory(value);
      setForm(prev => ({ ...prev, subcategory: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        category: form.category,
        pricingType: form.pricingType,
      };

      if (form.subcategory) payload.subcategory = form.subcategory;
      if (form.priceMin) payload.priceMin = parseFloat(form.priceMin);
      if (form.priceMax) payload.priceMax = parseFloat(form.priceMax);
      if (form.priceUnit) payload.priceUnit = form.priceUnit;
      if (form.pricingNotes) payload.pricingNotes = form.pricingNotes;
      if (form.leadTime) payload.leadTime = form.leadTime;
      if (form.capacity) payload.capacity = form.capacity;
      if (form.coverageArea) payload.coverageArea = form.coverageArea;
      if (form.pastPerformance) payload.pastPerformance = form.pastPerformance;
      if (form.certifications.trim()) {
        payload.certifications = form.certifications.split(',').map(c => c.trim()).filter(Boolean);
      }

      const res = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Service listing created successfully!');
        router.push(`/marketplace/listings/${data.listing.slug}`);
      } else if (res.status === 401) {
        toast.error('Please sign in to create a listing.');
        router.push('/login?returnTo=/provider-dashboard/new-listing');
      } else if (res.status === 403) {
        const err = await res.json();
        toast.error(err.error || 'You must claim a company profile before creating listings.');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create listing. Please check your inputs.');
      }
    } catch {
      toast.error('Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionStatus === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  const inputClass = 'w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50';
  const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5';

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/provider-dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← Back to Dashboard
          </Link>
        </div>

        <AnimatedPageHeader
          title="Create New Listing"
          subtitle="List your space products and services to reach qualified buyers"
        />

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Service Name */}
          <div>
            <label htmlFor="name" className={labelClass}>Service Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={form.name}
              onChange={handleChange}
              placeholder="e.g., Dedicated Small-Sat Launch to LEO"
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClass}>Description *</label>
            <textarea
              id="description"
              name="description"
              required
              minLength={20}
              maxLength={10000}
              rows={5}
              value={form.description}
              onChange={handleChange}
              placeholder="Describe your service, capabilities, and what makes your offering unique..."
              className={inputClass}
            />
            <p className="text-xs text-slate-500 mt-1">{form.description.length}/10,000 characters (min 20)</p>
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className={labelClass}>Category *</label>
              <select
                id="category"
                name="category"
                required
                value={form.category}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Select a category</option>
                {MARKETPLACE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="subcategory" className={labelClass}>Subcategory</label>
              <select
                id="subcategory"
                name="subcategory"
                value={form.subcategory}
                onChange={handleChange}
                disabled={!selectedCategory}
                className={inputClass}
              >
                <option value="">Select a subcategory</option>
                {subcategories.map(sub => (
                  <option key={sub.value} value={sub.value}>{sub.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pricingType" className={labelClass}>Pricing Type *</label>
                <select
                  id="pricingType"
                  name="pricingType"
                  required
                  value={form.pricingType}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select pricing type</option>
                  {PRICING_TYPES.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="priceUnit" className={labelClass}>Price Unit</label>
                <input
                  id="priceUnit"
                  name="priceUnit"
                  type="text"
                  value={form.priceUnit}
                  onChange={handleChange}
                  placeholder="e.g., per kg, per month, per launch"
                  className={inputClass}
                />
              </div>
            </div>
            {form.pricingType && form.pricingType !== 'rfq_only' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="priceMin" className={labelClass}>Minimum Price (USD)</label>
                  <input
                    id="priceMin"
                    name="priceMin"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.priceMin}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="priceMax" className={labelClass}>Maximum Price (USD)</label>
                  <input
                    id="priceMax"
                    name="priceMax"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.priceMax}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="pricingNotes" className={labelClass}>Pricing Notes</label>
              <input
                id="pricingNotes"
                name="pricingNotes"
                type="text"
                maxLength={2000}
                value={form.pricingNotes}
                onChange={handleChange}
                placeholder="e.g., Volume discounts available, pricing varies by orbit"
                className={inputClass}
              />
            </div>
          </div>

          {/* Service Details */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Service Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="leadTime" className={labelClass}>Lead Time</label>
                <input
                  id="leadTime"
                  name="leadTime"
                  type="text"
                  maxLength={100}
                  value={form.leadTime}
                  onChange={handleChange}
                  placeholder="e.g., 12-18 months, 6 weeks"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="capacity" className={labelClass}>Capacity</label>
                <input
                  id="capacity"
                  name="capacity"
                  type="text"
                  maxLength={200}
                  value={form.capacity}
                  onChange={handleChange}
                  placeholder="e.g., 4 launches/year, 500 kg to LEO"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="coverageArea" className={labelClass}>Coverage Area</label>
              <input
                id="coverageArea"
                name="coverageArea"
                type="text"
                maxLength={200}
                value={form.coverageArea}
                onChange={handleChange}
                placeholder="e.g., Global, LEO only, North America"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="certifications" className={labelClass}>Certifications</label>
              <input
                id="certifications"
                name="certifications"
                type="text"
                value={form.certifications}
                onChange={handleChange}
                placeholder="Comma-separated, e.g., ISO 9001, AS9100, ITAR"
                className={inputClass}
              />
              <p className="text-xs text-slate-500 mt-1">Separate multiple certifications with commas</p>
            </div>
            <div>
              <label htmlFor="pastPerformance" className={labelClass}>Past Performance</label>
              <textarea
                id="pastPerformance"
                name="pastPerformance"
                maxLength={5000}
                rows={3}
                value={form.pastPerformance}
                onChange={handleChange}
                placeholder="Describe relevant past projects, contracts, or mission heritage..."
                className={inputClass}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !form.name || !form.description || !form.category || !form.pricingType}
              className="px-6 py-2.5 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg font-semibold text-sm transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Listing'}
            </button>
            <Link href="/provider-dashboard" className="px-5 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
