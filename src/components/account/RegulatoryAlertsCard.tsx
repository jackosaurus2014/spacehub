'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import {
  RADAR_CATEGORIES,
  RADAR_CATEGORY_LABELS,
  type RadarCategory,
} from '@/lib/regulatory-categorizer';

/**
 * "Regulatory alerts" settings card (Regulatory Wave C — Pro feature).
 * Rendered in the account page's Notifications section.
 *
 * Free users see the card with an upgrade CTA (the API also rejects their
 * writes server-side — this gate is presentation, not enforcement).
 * Pro users pick categories, a frequency, and a master enable, saved in one
 * PUT to /api/regulatory-alerts/preferences.
 */

interface RegulatoryAlertPrefs {
  enabled: boolean;
  watchedCategories: RadarCategory[];
  frequency: 'immediate' | 'daily';
}

const CATEGORY_DESCRIPTIONS: Partial<Record<RadarCategory, string>> = {
  enforcement: 'Penalties, denial orders, debarments, settlements',
  'export-controls': 'ITAR / EAR rule changes and export-control legislation',
  'launch-licensing': 'FAA launch and reentry licensing rules',
  spectrum: 'FCC spectrum, orbital slots, satellite communications',
  'remote-sensing': 'Commercial Earth-observation licensing',
  'procurement-policy': 'Acquisition rules, budgets, national space policy',
  'space-traffic': 'Orbital debris, disposal, and traffic coordination rules',
  other: 'Significant actions outside the categories above',
};

export default function RegulatoryAlertsCard() {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [available, setAvailable] = useState(true);
  const [prefs, setPrefs] = useState<RegulatoryAlertPrefs>({
    enabled: false,
    watchedCategories: [],
    frequency: 'daily',
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/regulatory-alerts/preferences');
      if (res.ok) {
        const json = await res.json();
        setIsPro(Boolean(json.data?.isPro));
        setAvailable(json.data?.available !== false);
        if (json.data?.preferences) {
          setPrefs({
            enabled: Boolean(json.data.preferences.enabled),
            watchedCategories: Array.isArray(json.data.preferences.watchedCategories)
              ? json.data.preferences.watchedCategories
              : [],
            frequency: json.data.preferences.frequency === 'immediate' ? 'immediate' : 'daily',
          });
        }
      }
    } catch {
      // Fail quietly — the card renders its non-Pro / default state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const toggleCategory = (cat: RadarCategory) => {
    setPrefs((p) => ({
      ...p,
      watchedCategories: p.watchedCategories.includes(cat)
        ? p.watchedCategories.filter((c) => c !== cat)
        : [...p.watchedCategories, cat],
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/regulatory-alerts/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(extractApiError(json, 'Failed to save regulatory alert preferences'));
        return;
      }
      setDirty(false);
      toast.success('Regulatory alert preferences saved');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-6 mt-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-white/[0.08] rounded w-40" />
          <div className="h-3 bg-white/[0.08] rounded w-72" />
          <div className="h-24 bg-white/[0.06] rounded w-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-6 mt-6">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold">Regulatory Alerts</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
          Pro
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-5">
        Pick regulatory categories to watch and get an email when something significant lands —
        final rules, interim final rules, enforcement actions, and passage-level legislation.
        Routine notices and filings are filtered out.
      </p>

      {!available ? (
        <p className="text-sm text-slate-500">
          Regulatory alerts are being set up — check back shortly.
        </p>
      ) : !isPro ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <p className="text-sm text-slate-300 mb-1">
            Per-category regulatory email alerts are a SpaceNexus Pro feature.
          </p>
          <p className="text-xs text-slate-500 mb-4">
            The{' '}
            <Link href="/regulatory-radar" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Regulatory Radar
            </Link>{' '}
            timeline stays free for everyone, and significant export-control actions ship in the
            free newsletter digest.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors"
            >
              Upgrade to Pro
            </Link>
            <Link
              href="/regulatory-radar"
              className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-sm transition-colors"
            >
              Browse the Radar
            </Link>
          </div>
        </div>
      ) : (
        <div>
          {/* Master enable */}
          <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
            <div className="mr-4">
              <p className="text-sm font-medium text-white">Email alerts enabled</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Master switch — no emails are sent while this is off
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.enabled}
              aria-label="Email alerts enabled"
              onClick={() => {
                setPrefs((p) => ({ ...p, enabled: !p.enabled }));
                setDirty(true);
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black ${
                prefs.enabled ? 'bg-white' : 'bg-white/[0.1]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                  prefs.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Category checkboxes */}
          <fieldset className="py-4 border-b border-white/[0.06]">
            <legend className="text-sm font-medium text-white mb-3">Watched categories</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RADAR_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer min-h-[44px]"
                >
                  <input
                    type="checkbox"
                    checked={prefs.watchedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.06] text-violet-500 focus:ring-2 focus:ring-white/30"
                  />
                  <span>
                    <span className="block text-sm text-white">{RADAR_CATEGORY_LABELS[cat]}</span>
                    {CATEGORY_DESCRIPTIONS[cat] && (
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {CATEGORY_DESCRIPTIONS[cat]}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Frequency */}
          <fieldset className="py-4 border-b border-white/[0.06]">
            <legend className="text-sm font-medium text-white mb-1">Frequency</legend>
            <p className="text-xs text-slate-400 mb-3">
              Immediate sends within the hour of a qualifying action landing; daily batches
              everything into one email at 08:00 UTC.
            </p>
            <div className="flex gap-2">
              {(
                [
                  { value: 'immediate', label: 'Immediate' },
                  { value: 'daily', label: 'Daily digest' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`px-4 py-2 min-h-[44px] inline-flex items-center rounded-lg text-sm cursor-pointer transition-colors border ${
                    prefs.frequency === opt.value
                      ? 'bg-white text-slate-900 border-white font-medium'
                      : 'bg-white/[0.04] text-slate-300 border-white/[0.1] hover:bg-white/[0.08]'
                  }`}
                >
                  <input
                    type="radio"
                    name="regulatory-alert-frequency"
                    value={opt.value}
                    checked={prefs.frequency === opt.value}
                    onChange={() => {
                      setPrefs((p) => ({ ...p, frequency: opt.value }));
                      setDirty(true);
                    }}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="px-6 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
            {prefs.enabled && prefs.watchedCategories.length === 0 && (
              <p className="text-xs text-amber-400">
                Pick at least one category to receive alerts.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
