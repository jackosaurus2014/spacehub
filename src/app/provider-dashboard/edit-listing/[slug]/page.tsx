'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

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
    certifications: '',
    pastPerformance: '',
  });

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push(`/login?returnTo=/provider-dashboard/edit-listing/${params.slug}`);
      return;
    }
    if (sessionStatus !== 'authenticated') return;

    async function loadListing() {
      try {
        const res = await fetch(`/api/marketplace/listings/${params.slug}`);
        if (!res.ok) {
          toast.error('Listing not found');
          router.push('/provider-dashboard?tab=listings');
          return;
        }
        const data = await res.json();
        const l = data.listing;
        setForm({
          name: l.name || '',
          description: l.description || '',
          category: l.category || '',
          subcategory: l.subcategory || '',
          pricingType: l.pricingType || '',
          priceMin: l.priceMin?.toString() || '',
          priceMax: l.priceMax?.toString() || '',
          priceUnit: l.priceUnit || '',
          pricingNotes: l.pricingNotes || '',
          leadTime: l.leadTime || '',
          capacity: l.capacity || '',
          coverageArea: l.coverageArea || '',
          certifications: (l.certifications || []).join(', '),
          pastPerformance: l.pastPerformance || '',
        });
        setSelectedCategory(l.category || '');
      } catch {
        toast.error('Failed to load listing');
      } finally {
        setLoading(false);
      }
    }
    loadListing();
  }, [sessionStatus, params.slug, router]);

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
      else payload.priceMin = null;
      if (form.priceMax) payload.priceMax = parseFloat(form.priceMax);
      else payload.priceMax = null;
      if (form.priceUnit) payload.priceUnit = form.priceUnit;
      if (form.pricingNotes) payload.pricingNotes = form.pricingNotes;
      if (form.leadTime) payload.leadTime = form.leadTime;
      if (form.capacity) payload.capacity = form.capacity;
      if (form.coverageArea) payload.coverageArea = form.coverageArea;
      if (form.pastPerformance) payload.pastPerformance = form.pastPerformance;
      payload.certifications = form.certifications.trim()
        ? form.certifications.split(',').map(c => c.trim()).filter(Boolean)
        : [];

      const res = await fetch(`/api/marketplace/listings/${params.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Listing updated successfully!');
        router.push('/provider-dashboard?tab=listings');
      } else if (res.status === 403) {
        toast.error('You are not authorized to edit this listing.');
      } else {
        const err = await res.json();
        toast.error(err.error?.message || err.error || 'Failed to update listing.');
      }
    } catch {
      toast.error('Failed to update listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || sessionStatus === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  const inputClass = 'w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50';
  const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5';

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/provider-dashboard?tab=listings" className="text-sm text-slate-400 hover:text-white transition-colors">← Back to Listings</Link>
        </div>

        <AnimatedPageHeader title="Edit Listing" subtitle="Update your service listing details" />

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="name" className={labelClass}>Service Name *</label>
            <input id="name" name="name" type="text" required minLength={3} maxLength={200} value={form.name} onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>Description *</label>
            <textarea id="description" name="description" required minLength={20} maxLength={10000} rows={5} value={form.description} onChange={handleChange} className={inputClass} />
            <p className="text-xs text-slate-500 mt-1">{form.description.length}/10,000 characters</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className={labelClass}>Category *</label>
              <select id="category" name="category" required value={form.category} onChange={handleChange} className={inputClass}>
                <option value="">Select a category</option>
                {MARKETPLACE_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="subcategory" className={labelClass}>Subcategory</label>
              <select id="subcategory" name="subcategory" value={form.subcategory} onChange={handleChange} disabled={!selectedCategory} className={inputClass}>
                <option value="">Select a subcategory</option>
                {subcategories.map(sub => <option key={sub.value} value={sub.value}>{sub.label}</option>)}
              </select>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pricingType" className={labelClass}>Pricing Type *</label>
                <select id="pricingType" name="pricingType" required value={form.pricingType} onChange={handleChange} className={inputClass}>
                  <option value="">Select pricing type</option>
                  {PRICING_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="priceUnit" className={labelClass}>Price Unit</label>
                <input id="priceUnit" name="priceUnit" value={form.priceUnit} onChange={handleChange} placeholder="e.g., per kg, per month" className={inputClass} />
              </div>
            </div>
            {form.pricingType && form.pricingType !== 'rfq_only' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="priceMin" className={labelClass}>Minimum Price (USD)</label>
                  <input id="priceMin" name="priceMin" type="number" min="0" step="0.01" value={form.priceMin} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="priceMax" className={labelClass}>Maximum Price (USD)</label>
                  <input id="priceMax" name="priceMax" type="number" min="0" step="0.01" value={form.priceMax} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="pricingNotes" className={labelClass}>Pricing Notes</label>
              <input id="pricingNotes" name="pricingNotes" maxLength={2000} value={form.pricingNotes} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Service Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="leadTime" className={labelClass}>Lead Time</label>
                <input id="leadTime" name="leadTime" maxLength={100} value={form.leadTime} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label htmlFor="capacity" className={labelClass}>Capacity</label>
                <input id="capacity" name="capacity" maxLength={200} value={form.capacity} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="coverageArea" className={labelClass}>Coverage Area</label>
              <input id="coverageArea" name="coverageArea" maxLength={200} value={form.coverageArea} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label htmlFor="certifications" className={labelClass}>Certifications</label>
              <input id="certifications" name="certifications" value={form.certifications} onChange={handleChange} placeholder="Comma-separated, e.g., ISO 9001, AS9100, ITAR" className={inputClass} />
            </div>
            <div>
              <label htmlFor="pastPerformance" className={labelClass}>Past Performance</label>
              <textarea id="pastPerformance" name="pastPerformance" maxLength={5000} rows={3} value={form.pastPerformance} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={submitting || !form.name || !form.description || !form.category || !form.pricingType} className="px-6 py-2.5 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg font-semibold text-sm transition-colors">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href="/provider-dashboard?tab=listings" className="px-5 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
