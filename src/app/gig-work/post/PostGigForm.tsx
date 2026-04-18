'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { clientLogger } from '@/lib/client-logger';

const CATEGORIES = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'operations', label: 'Operations' },
  { value: 'business', label: 'Business' },
  { value: 'research', label: 'Research' },
  { value: 'legal', label: 'Legal' },
  { value: 'manufacturing', label: 'Manufacturing' },
] as const;

const WORK_TYPES = [
  { value: 'freelance', label: 'Freelance' },
  { value: 'contract', label: 'Contract' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'side_project', label: 'Side project' },
] as const;

const BUDGET_TYPES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export default function PostGigForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'engineering',
    workType: 'contract',
    skills: '',
    duration: '',
    hoursPerWeek: '',
    budgetMin: '',
    budgetMax: '',
    budgetType: 'hourly',
    location: '',
    remoteOk: true,
    clearanceRequired: false,
    companyName: '',
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const skills = form.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skills.length === 0) {
      setError('Add at least one required skill (comma-separated).');
      return;
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      workType: form.workType,
      skills,
      budgetType: form.budgetType,
      remoteOk: form.remoteOk,
      clearanceRequired: form.clearanceRequired,
    };
    if (form.duration.trim()) payload.duration = form.duration.trim();
    if (form.location.trim()) payload.location = form.location.trim();
    if (form.companyName.trim()) payload.companyName = form.companyName.trim();
    if (form.hoursPerWeek.trim()) {
      const n = parseInt(form.hoursPerWeek, 10);
      if (!Number.isNaN(n)) payload.hoursPerWeek = n;
    }
    if (form.budgetMin.trim()) {
      const n = parseInt(form.budgetMin, 10);
      if (!Number.isNaN(n)) payload.budgetMin = n;
    }
    if (form.budgetMax.trim()) {
      const n = parseInt(form.budgetMax, 10);
      if (!Number.isNaN(n)) payload.budgetMax = n;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/gig-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const message = data?.error?.message || 'Failed to post gig';
        setError(message);
        toast.error(message);
        return;
      }

      toast.success('Gig posted');
      const id = data.data?.gig?.id;
      if (id) router.push(`/gig-work/${id}`);
      else router.push('/gig-work/my-gigs');
    } catch (err) {
      clientLogger.error('Post gig failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/50';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          maxLength={200}
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="e.g. Satellite ground station integration consultant"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          required
          minLength={10}
          maxLength={10000}
          rows={8}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Describe the work, deliverables, timeline, and context."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Category <span className="text-red-400">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-black">
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Work type <span className="text-red-400">*</span>
          </label>
          <select
            value={form.workType}
            onChange={(e) => update('workType', e.target.value)}
            className={inputClass}
          >
            {WORK_TYPES.map((w) => (
              <option key={w.value} value={w.value} className="bg-black">
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Required skills <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={form.skills}
          onChange={(e) => update('skills', e.target.value)}
          placeholder="Comma-separated, e.g. propulsion, avionics, systems engineering"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Budget min (USD)</label>
          <input
            type="number"
            min={0}
            value={form.budgetMin}
            onChange={(e) => update('budgetMin', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Budget max (USD)</label>
          <input
            type="number"
            min={0}
            value={form.budgetMax}
            onChange={(e) => update('budgetMax', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Budget type</label>
          <select
            value={form.budgetType}
            onChange={(e) => update('budgetType', e.target.value)}
            className={inputClass}
          >
            {BUDGET_TYPES.map((b) => (
              <option key={b.value} value={b.value} className="bg-black">
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Duration</label>
          <input
            type="text"
            maxLength={100}
            value={form.duration}
            onChange={(e) => update('duration', e.target.value)}
            placeholder="e.g. 3 months"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hours / week</label>
          <input
            type="number"
            min={1}
            max={168}
            value={form.hoursPerWeek}
            onChange={(e) => update('hoursPerWeek', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            type="text"
            maxLength={200}
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder="e.g. Denver, CO"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Company name (optional)
        </label>
        <input
          type="text"
          maxLength={200}
          value={form.companyName}
          onChange={(e) => update('companyName', e.target.value)}
          placeholder="Used the first time you post if you have no employer profile"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300 rounded-lg border border-white/20 bg-black/40 px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.remoteOk}
            onChange={(e) => update('remoteOk', e.target.checked)}
            className="accent-white"
          />
          Remote friendly
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300 rounded-lg border border-white/20 bg-black/40 px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.clearanceRequired}
            onChange={(e) => update('clearanceRequired', e.target.checked)}
            className="accent-white"
          />
          Security clearance required
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
        >
          {submitting ? 'Posting…' : 'Post gig'}
        </button>
      </div>
    </form>
  );
}
