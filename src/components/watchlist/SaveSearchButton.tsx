'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';

interface SaveSearchButtonProps {
  searchType: 'company_directory' | 'marketplace_listings' | 'marketplace_rfqs';
  filters: Record<string, unknown>;
  query?: string;
}

export default function SaveSearchButton({ searchType, filters, query }: SaveSearchButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for this search');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          searchType,
          filters,
          query: query || null,
          alertEnabled,
        }),
      });

      if (res.ok) {
        toast.success('Search saved');
        setShowForm(false);
        setName('');
        setAlertEnabled(false);
      } else if (res.status === 401) {
        toast.error('Sign in to save searches');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save search');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-colors"
      >
        <span>💾</span>
        <span>Save Search</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Search name..."
        maxLength={200}
        autoFocus
        className="px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none w-40"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setShowForm(false);
        }}
      />
      <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          checked={alertEnabled}
          onChange={(e) => setAlertEnabled(e.target.checked)}
          className="w-3 h-3 rounded bg-slate-700 border-slate-600"
        />
        Alerts
      </label>
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
      >
        {saving ? '...' : 'Save'}
      </button>
      <button
        onClick={() => { setShowForm(false); setName(''); }}
        className="px-2 py-1.5 text-slate-400 hover:text-white text-xs transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
