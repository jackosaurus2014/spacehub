'use client';

import { useState } from 'react';
import { MARKETPLACE_CATEGORIES, CERTIFICATION_OPTIONS } from '@/lib/marketplace-types';
import { toast } from '@/lib/toast';

interface RFQFormProps {
  onSuccess?: (rfq: any) => void;
}

export default function RFQForm({ onSuccess }: RFQFormProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: '',
    category: '',
    subcategory: '',
    description: '',
    requirements: '',
    budgetMin: '',
    budgetMax: '',
    budgetCurrency: 'USD',
    deadline: '',
    deliveryDate: '',
    complianceReqs: [] as string[],
    isPublic: true,
  });

  const selectedCategory = MARKETPLACE_CATEGORIES.find((c) => c.value === form.category);
  const today = new Date().toISOString().split('T')[0];

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear related validation errors when fields change
    if (field === 'budgetMin' || field === 'budgetMax') {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.budget;
        return next;
      });
    }
    if (field === 'deadline' || field === 'deliveryDate') {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.deadline;
        delete next.deliveryDate;
        return next;
      });
    }
  };

  const toggleCert = (cert: string) => {
    setForm((prev) => ({
      ...prev,
      complianceReqs: prev.complianceReqs.includes(cert)
        ? prev.complianceReqs.filter((c) => c !== cert)
        : [...prev.complianceReqs, cert],
    }));
  };

  const validateBudgetAndDates = (): boolean => {
    const errors: Record<string, string> = {};

    if (form.budgetMin && form.budgetMax) {
      if (parseFloat(form.budgetMin) > parseFloat(form.budgetMax)) {
        errors.budget = 'Minimum budget cannot exceed maximum budget';
      }
    }

    if (form.deadline && form.deadline < today) {
      errors.deadline = 'Response deadline must be today or later';
    }

    if (form.deliveryDate && form.deliveryDate < today) {
      errors.deliveryDate = 'Delivery date must be today or later';
    }

    if (form.deadline && form.deliveryDate && form.deliveryDate < form.deadline) {
      errors.deliveryDate = 'Delivery date must be on or after the response deadline';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateBudgetAndDates()) return;
    setSubmitting(true);
    try {
      let reqJson = {};
      if (form.requirements.trim()) {
        try { reqJson = JSON.parse(form.requirements); } catch { reqJson = { details: form.requirements }; }
      }

      const res = await fetch('/api/marketplace/rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          subcategory: form.subcategory || undefined,
          description: form.description,
          requirements: reqJson,
          budgetMin: form.budgetMin ? parseFloat(form.budgetMin) : undefined,
          budgetMax: form.budgetMax ? parseFloat(form.budgetMax) : undefined,
          budgetCurrency: form.budgetCurrency,
          deadline: form.deadline || undefined,
          deliveryDate: form.deliveryDate || undefined,
          complianceReqs: form.complianceReqs,
          isPublic: form.isPublic,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit RFQ');
      }

      const data = await res.json();
      toast.success('RFQ submitted successfully! Matching providers...');
      onSuccess?.(data.rfq);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit RFQ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              s <= step ? 'bg-white text-slate-900' : 'bg-slate-700 text-slate-500'
            }`}>
              {s < step ? '✓' : s}
            </div>
            {s < 4 && <div className={`flex-1 h-0.5 ${s < step ? 'bg-white' : 'bg-slate-700'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Category & Title */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">What do you need?</h3>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Service Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MARKETPLACE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => updateField('category', cat.value)}
                  className={`p-3 rounded-lg text-left transition-all ${
                    form.category === cat.value
                      ? 'bg-white/10 ring-2 ring-white/15 text-slate-900'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <div className="text-xs font-medium mt-1">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>
          {selectedCategory && (
            <div>
              <label htmlFor="rfq-subcategory" className="block text-sm text-slate-400 mb-2">Subcategory (optional)</label>
              <select
                id="rfq-subcategory"
                value={form.subcategory}
                onChange={(e) => updateField('subcategory', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
              >
                <option value="">All subcategories</option>
                {selectedCategory.subcategories.map((sub) => (
                  <option key={sub.value} value={sub.value}>{sub.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="rfq-title" className="block text-sm text-slate-400 mb-2">RFQ Title</label>
            <input
              id="rfq-title"
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., Dedicated launch to SSO for 500kg payload"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
            />
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!form.category || !form.title}
            className="w-full py-2.5 bg-white hover:bg-slate-100 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 rounded-lg font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Requirements */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Describe your requirements</h3>
          <div>
            <label htmlFor="rfq-description" className="block text-sm text-slate-400 mb-2">Description</label>
            <textarea
              id="rfq-description"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
              placeholder="Describe what you need, including technical requirements, volume, timeline expectations..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
            />
          </div>
          <div>
            <label htmlFor="rfq-requirements" className="block text-sm text-slate-400 mb-2">Technical Requirements (optional)</label>
            <textarea
              id="rfq-requirements"
              value={form.requirements}
              onChange={(e) => updateField('requirements', e.target.value)}
              rows={3}
              placeholder="Additional technical specs, constraints, or requirements..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!form.description}
              className="flex-1 py-2.5 bg-white hover:bg-slate-100 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 rounded-lg font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Budget & Timeline & Compliance */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Budget, Timeline & Compliance</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rfq-budget-min" className="block text-sm text-slate-400 mb-2">Min Budget ($) <span className="text-yellow-500/70 text-xs">recommended</span></label>
              <input
                id="rfq-budget-min"
                type="number"
                inputMode="numeric"
                min="0"
                value={form.budgetMin}
                onChange={(e) => updateField('budgetMin', e.target.value)}
                placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
              />
            </div>
            <div>
              <label htmlFor="rfq-budget-max" className="block text-sm text-slate-400 mb-2">Max Budget ($) <span className="text-yellow-500/70 text-xs">recommended</span></label>
              <input
                id="rfq-budget-max"
                type="number"
                inputMode="numeric"
                min="0"
                value={form.budgetMax}
                onChange={(e) => updateField('budgetMax', e.target.value)}
                placeholder="100,000"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
              />
            </div>
          </div>
          {validationErrors.budget && (
            <p className="text-xs text-red-400 mt-1">{validationErrors.budget}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rfq-deadline" className="block text-sm text-slate-400 mb-2">Response Deadline</label>
              <input
                id="rfq-deadline"
                type="date"
                min={today}
                value={form.deadline}
                onChange={(e) => updateField('deadline', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
              />
              {validationErrors.deadline && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.deadline}</p>
              )}
            </div>
            <div>
              <label htmlFor="rfq-delivery-date" className="block text-sm text-slate-400 mb-2">Delivery Date</label>
              <input
                id="rfq-delivery-date"
                type="date"
                min={today}
                value={form.deliveryDate}
                onChange={(e) => updateField('deliveryDate', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
              />
              {validationErrors.deliveryDate && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.deliveryDate}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Required Certifications</label>
            <div className="flex flex-wrap gap-2">
              {CERTIFICATION_OPTIONS.map((cert) => (
                <button
                  key={cert.value}
                  onClick={() => toggleCert(cert.value)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                    form.complianceReqs.includes(cert.value)
                      ? 'bg-white/10 text-slate-300 ring-1 ring-white/15'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {cert.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={form.isPublic}
              onChange={(e) => updateField('isPublic', e.target.checked)}
              className="rounded bg-slate-700 border-slate-600"
            />
            <label htmlFor="isPublic" className="text-sm text-slate-400">
              Make this RFQ publicly visible (recommended for more responses)
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
              Back
            </button>
            <button
              onClick={() => { if (validateBudgetAndDates()) setStep(4); }}
              className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-medium transition-colors"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Review & Submit</h3>
          <div className="card p-4 space-y-3">
            <div>
              <div className="text-xs text-slate-500 uppercase">Title</div>
              <div className="text-sm text-white font-medium">{form.title}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500 uppercase">Category</div>
                <div className="text-sm text-white">{selectedCategory?.icon} {selectedCategory?.label}</div>
              </div>
              {form.budgetMax && (
                <div>
                  <div className="text-xs text-slate-500 uppercase">Budget</div>
                  <div className="text-sm text-emerald-400">
                    {form.budgetMin ? `$${parseInt(form.budgetMin).toLocaleString()} - ` : ''}${parseInt(form.budgetMax).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase">Description</div>
              <div className="text-xs text-slate-300 line-clamp-4">{form.description}</div>
            </div>
            {form.complianceReqs.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 uppercase">Required Certifications</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.complianceReqs.map((c) => (
                    <span key={c} className="text-xs px-1.5 py-0.5 bg-white/5 text-slate-300 rounded">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {!form.budgetMin && !form.budgetMax && (
              <div className="text-xs text-yellow-500/80 bg-yellow-500/10 rounded px-3 py-2">
                No budget specified — adding a budget range helps providers submit more accurate proposals.
              </div>
            )}
            <div className="text-xs text-slate-500">
              {form.isPublic ? 'Public RFQ — visible to all providers' : 'Private RFQ — only matched providers can see'}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 bg-gradient-to-r from-slate-200 to-blue-600 hover:from-white hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg font-semibold transition-all"
            >
              {submitting ? 'Submitting...' : 'Submit RFQ & Match Providers'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
