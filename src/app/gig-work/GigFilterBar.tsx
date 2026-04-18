'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface FilterState {
  category: string;
  workType: string;
  isRemote: boolean;
  minBudget: string;
  maxBudget: string;
  q: string;
}

const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'operations', label: 'Operations' },
  { value: 'business', label: 'Business' },
  { value: 'research', label: 'Research' },
  { value: 'legal', label: 'Legal' },
  { value: 'manufacturing', label: 'Manufacturing' },
];

const WORK_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'contract', label: 'Contract' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'side_project', label: 'Side project' },
];

export default function GigFilterBar({ initial }: { initial: FilterState }) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(initial);
  const [isPending, startTransition] = useTransition();

  const applyFilters = (next: FilterState) => {
    const params = new URLSearchParams();
    if (next.category) params.set('category', next.category);
    if (next.workType) params.set('workType', next.workType);
    if (next.isRemote) params.set('isRemote', 'true');
    if (next.minBudget) params.set('minBudget', next.minBudget);
    if (next.maxBudget) params.set('maxBudget', next.maxBudget);
    if (next.q.trim()) params.set('q', next.q.trim());
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/gig-work?${qs}` : '/gig-work');
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(filters);
  };

  const handleReset = () => {
    const cleared: FilterState = {
      category: '',
      workType: '',
      isRemote: false,
      minBudget: '',
      maxBudget: '',
      q: '',
    };
    setFilters(cleared);
    applyFilters(cleared);
  };

  const hasAny =
    filters.category ||
    filters.workType ||
    filters.isRemote ||
    filters.minBudget ||
    filters.maxBudget ||
    filters.q;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/20 bg-white/5 p-4 flex flex-col gap-3"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search gigs by title, description, or skill…"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          className="flex-1 rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/50"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Searching…' : 'Search'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value} className="bg-black">
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={filters.workType}
          onChange={(e) => setFilters({ ...filters, workType: e.target.value })}
          className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
        >
          {WORK_TYPES.map((w) => (
            <option key={w.value} value={w.value} className="bg-black">
              {w.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={0}
          placeholder="Min budget"
          value={filters.minBudget}
          onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
          className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/50"
        />

        <input
          type="number"
          min={0}
          placeholder="Max budget"
          value={filters.maxBudget}
          onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
          className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/50"
        />

        <label className="flex items-center gap-2 text-sm text-slate-300 rounded-lg border border-white/20 bg-black/40 px-3 py-2 cursor-pointer hover:bg-black/60">
          <input
            type="checkbox"
            checked={filters.isRemote}
            onChange={(e) => setFilters({ ...filters, isRemote: e.target.checked })}
            className="accent-white"
          />
          Remote only
        </label>

        <button
          type="button"
          onClick={handleReset}
          disabled={!hasAny}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Clear filters
        </button>
      </div>
    </form>
  );
}
