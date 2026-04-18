'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';

export const dynamic = 'force-dynamic';

interface EventOption {
  id: string;
  name: string;
  launchDate: string | null;
  status: string;
  agency: string | null;
  rocket: string | null;
  country: string | null;
  mission: string | null;
}

interface TimelineItem {
  t: string;
  label: string;
  note?: string;
}

interface SourceItem {
  url: string;
  title: string;
}

type StatusValue = 'success' | 'partial' | 'failure' | 'scrubbed';

const STATUS_OPTIONS: { value: StatusValue; label: string }[] = [
  { value: 'success', label: 'Success' },
  { value: 'partial', label: 'Partial Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'scrubbed', label: 'Scrubbed' },
];

export default function NewMissionDebriefPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // Event picker
  const [eventQuery, setEventQuery] = useState('');
  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);
  const [eventSearchLoading, setEventSearchLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form fields
  const [missionName, setMissionName] = useState('');
  const [missionDate, setMissionDate] = useState('');
  const [statusValue, setStatusValue] = useState<StatusValue>('success');
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [fullAnalysis, setFullAnalysis] = useState('');
  const [keyTakeawaysText, setKeyTakeawaysText] = useState(''); // newline-separated
  const [timelineText, setTimelineText] = useState(''); // each line: "t | label | note"
  const [sourcesText, setSourcesText] = useState(''); // each line: "title | url"
  const [costsEstimate, setCostsEstimate] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [companyIdsText, setCompanyIdsText] = useState(''); // comma-separated
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedBy, setGeneratedBy] = useState<'manual' | 'claude' | 'mixed'>('manual');
  const [publishImmediately, setPublishImmediately] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Search events whenever query changes
  const runEventSearch = useCallback(async (q: string) => {
    setEventSearchLoading(true);
    try {
      const res = await fetch(`/api/mission-debriefs/events-search?q=${encodeURIComponent(q)}&limit=15`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setEventOptions(data.events || []);
    } catch (e) {
      clientLogger.warn('event search failed', {
        error: e instanceof Error ? e.message : String(e),
      });
      setEventOptions([]);
    } finally {
      setEventSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !session?.user?.isAdmin) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runEventSearch(eventQuery);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [eventQuery, runEventSearch, authStatus, session]);

  function pickEvent(ev: EventOption) {
    setSelectedEvent(ev);
    setMissionName((prev) => prev || ev.name);
    if (ev.launchDate && !missionDate) {
      // Format for datetime-local
      const d = new Date(ev.launchDate);
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setMissionDate(formatted);
    }
    setEventOptions([]);
    setEventQuery('');
  }

  function parseTimeline(): TimelineItem[] {
    return timelineText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('|').map((p) => p.trim());
        return {
          t: parts[0] || '',
          label: parts[1] || '',
          note: parts[2] || undefined,
        };
      })
      .filter((it) => it.t && it.label);
  }
  function parseSources(): SourceItem[] {
    return sourcesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('|').map((p) => p.trim());
        return { title: parts[0] || '', url: parts[1] || '' };
      })
      .filter((it) => it.title && /^https?:\/\//i.test(it.url));
  }
  function parseTakeaways(): string[] {
    return keyTakeawaysText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  function parseCompanyIds(): string[] {
    return companyIdsText
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleGenerateAi() {
    if (!selectedEvent) {
      setError('Pick a SpaceEvent first.');
      return;
    }
    setAiLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/mission-debriefs/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          additionalContext: additionalContext || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.error || `Server returned ${res.status}`);
      }
      const draft = data.draft || {};
      if (typeof draft.executiveSummary === 'string') setExecutiveSummary(draft.executiveSummary);
      if (typeof draft.fullAnalysis === 'string') setFullAnalysis(draft.fullAnalysis);
      if (Array.isArray(draft.keyTakeaways)) {
        setKeyTakeawaysText(draft.keyTakeaways.join('\n'));
      }
      if (Array.isArray(draft.timeline)) {
        setTimelineText(
          draft.timeline
            .map((it: TimelineItem) => `${it.t || ''} | ${it.label || ''}${it.note ? ` | ${it.note}` : ''}`)
            .join('\n')
        );
      }
      if (Array.isArray(draft.sources)) {
        setSourcesText(
          draft.sources
            .map((s: SourceItem) => `${s.title || ''} | ${s.url || ''}`)
            .join('\n')
        );
      }
      if (typeof draft.costsEstimate === 'number') setCostsEstimate(String(draft.costsEstimate));
      if (
        typeof draft.status === 'string' &&
        ['success', 'partial', 'failure', 'scrubbed'].includes(draft.status)
      ) {
        setStatusValue(draft.status as StatusValue);
      }
      if (Array.isArray(data.suggestedCompanyIds) && data.suggestedCompanyIds.length > 0) {
        setCompanyIdsText(data.suggestedCompanyIds.join(', '));
      }
      setGeneratedBy('claude');
      setInfo('AI draft loaded. Review, edit, then save.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI generation failed';
      setError(msg);
      clientLogger.error('admin debrief AI generate failed', { error: msg });
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const payload: Record<string, unknown> = {
        missionName: missionName.trim(),
        missionDate: missionDate ? new Date(missionDate).toISOString() : '',
        status: statusValue,
        executiveSummary: executiveSummary.trim(),
        fullAnalysis: fullAnalysis.trim(),
        timeline: parseTimeline(),
        sources: parseSources(),
        keyTakeaways: parseTakeaways(),
        companyIds: parseCompanyIds(),
        currency: currency || 'USD',
        generatedBy,
        publishImmediately,
      };
      if (selectedEvent) payload.eventId = selectedEvent.id;
      if (costsEstimate.trim()) {
        const n = Number(costsEstimate);
        if (Number.isFinite(n) && n >= 0) payload.costsEstimate = n;
      }

      const res = await fetch('/api/mission-debriefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.error || `Server returned ${res.status}`);
      }
      setInfo('Saved!');
      const slug = data?.debrief?.slug;
      if (slug) {
        router.push(`/mission-debriefs/${slug}`);
      } else {
        router.push('/mission-debriefs/admin');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setError(msg);
      clientLogger.error('admin debrief save failed', { error: msg });
    } finally {
      setSaving(false);
    }
  }

  if (authStatus === 'loading') {
    return <div className="container mx-auto px-4 py-16 text-center text-slate-500 text-sm">Checking access…</div>;
  }
  if (authStatus !== 'authenticated' || !session?.user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl">
        <div className="card p-8 text-center">
          <div className="text-3xl mb-2">🔒</div>
          <p className="text-slate-300 mb-2">Admin access required.</p>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/mission-debriefs/admin"
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          ← Back to admin
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">New Mission Debrief</h1>
        <p className="text-sm text-slate-400 mt-1">
          Pick a SpaceEvent, optionally generate a draft with AI, then review and save.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Event picker */}
        <section className="card p-5">
          <label className="block text-sm font-medium text-slate-200 mb-2">
            SpaceEvent (optional but recommended)
          </label>
          {selectedEvent ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded border border-emerald-500/30 bg-emerald-500/5">
              <div className="min-w-0">
                <div className="text-sm text-white truncate">{selectedEvent.name}</div>
                <div className="text-xs text-slate-400">
                  {selectedEvent.launchDate ? new Date(selectedEvent.launchDate).toLocaleString() : '—'}
                  {selectedEvent.agency ? ` · ${selectedEvent.agency}` : ''}
                  {selectedEvent.rocket ? ` · ${selectedEvent.rocket}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-white"
                onClick={() => setSelectedEvent(null)}
              >
                Clear
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search events by name, mission, or rocket…"
                value={eventQuery}
                onChange={(e) => setEventQuery(e.target.value)}
                className="w-full bg-black border border-white/10 text-white text-sm rounded px-3 py-2"
              />
              {eventSearchLoading && (
                <div className="text-xs text-slate-500 mt-2">Searching…</div>
              )}
              {!eventSearchLoading && eventOptions.length > 0 && (
                <ul className="mt-2 border border-white/10 rounded divide-y divide-white/5 max-h-72 overflow-y-auto">
                  {eventOptions.map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => pickEvent(ev)}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 text-sm"
                      >
                        <div className="text-white truncate">{ev.name}</div>
                        <div className="text-xs text-slate-500">
                          {ev.launchDate ? new Date(ev.launchDate).toLocaleString() : '—'}
                          {ev.agency ? ` · ${ev.agency}` : ''}
                          {ev.rocket ? ` · ${ev.rocket}` : ''}
                          {ev.status ? ` · ${ev.status}` : ''}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {/* AI generation */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Generate with AI</h2>
              <p className="text-xs text-slate-400 mt-1">
                Calls Claude with the picked event + recent related news + matched companies.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={!selectedEvent || aiLoading}
              className="text-sm bg-purple-500/20 text-purple-200 border border-purple-500/40 rounded px-4 py-2 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading ? 'Generating…' : '🤖 Generate Draft'}
            </button>
          </div>
          <textarea
            placeholder="Optional: extra context for the AI (notes, sources, anomalies to weigh)…"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            className="w-full bg-black border border-white/10 text-white text-sm rounded px-3 py-2 min-h-[80px]"
          />
        </section>

        {/* Core fields */}
        <section className="card p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mission Name *</label>
              <input
                required
                type="text"
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                className="w-full bg-black border border-white/10 text-white text-sm rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mission Date *</label>
              <input
                required
                type="datetime-local"
                value={missionDate}
                onChange={(e) => setMissionDate(e.target.value)}
                className="w-full bg-black border border-white/10 text-white text-sm rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status *</label>
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value as StatusValue)}
                className="w-full bg-black border border-white/10 text-white text-sm rounded px-3 py-2"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Source</label>
              <select
                value={generatedBy}
                onChange={(e) => setGeneratedBy(e.target.value as 'manual' | 'claude' | 'mixed')}
                className="w-full bg-black border border-white/10 text-white text-sm rounded px-3 py-2"
              >
                <option value="manual">Manual</option>
                <option value="claude">Claude</option>
                <option value="mixed">Mixed (AI + edits)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Estimated Cost</label>
              <input
                type="number"
                min={0}
                step="any"
                value={costsEstimate}
                onChange={(e) => setCostsEstimate(e.target.value)}
                placeholder="e.g. 12500000"
                className="w-full bg-black border border-white/10 text-white text-sm rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Currency</label>
              <input
                type="text"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full bg-black border border-white/10 text-white text-sm rounded px-3 py-2 uppercase"
              />
            </div>
          </div>
        </section>

        {/* Executive summary */}
        <section className="card p-5">
          <label className="block text-xs text-slate-400 mb-1">Executive Summary *</label>
          <textarea
            required
            value={executiveSummary}
            onChange={(e) => setExecutiveSummary(e.target.value)}
            className="w-full bg-black border border-white/10 text-white text-sm rounded px-3 py-2 min-h-[140px]"
          />
        </section>

        {/* Key takeaways */}
        <section className="card p-5">
          <label className="block text-xs text-slate-400 mb-1">
            Key Takeaways (one per line)
          </label>
          <textarea
            value={keyTakeawaysText}
            onChange={(e) => setKeyTakeawaysText(e.target.value)}
            placeholder={'First takeaway\nSecond takeaway'}
            className="w-full bg-black border border-white/10 text-white text-sm rounded px-3 py-2 min-h-[100px]"
          />
        </section>

        {/* Timeline */}
        <section className="card p-5">
          <label className="block text-xs text-slate-400 mb-1">
            Timeline (one per line, format: <code>t | label | note</code>)
          </label>
          <textarea
            value={timelineText}
            onChange={(e) => setTimelineText(e.target.value)}
            placeholder={'T-0 | Liftoff | Nominal\nT+2:30 | MECO | Stage separation\nT+8:00 | SECO-1 | Orbital insertion'}
            className="w-full bg-black border border-white/10 text-white text-sm font-mono rounded px-3 py-2 min-h-[140px]"
          />
        </section>

        {/* Sources */}
        <section className="card p-5">
          <label className="block text-xs text-slate-400 mb-1">
            Sources (one per line, format: <code>title | url</code>)
          </label>
          <textarea
            value={sourcesText}
            onChange={(e) => setSourcesText(e.target.value)}
            placeholder={'NASASpaceflight launch coverage | https://nasaspaceflight.com/...'}
            className="w-full bg-black border border-white/10 text-white text-sm font-mono rounded px-3 py-2 min-h-[100px]"
          />
        </section>

        {/* Companies */}
        <section className="card p-5">
          <label className="block text-xs text-slate-400 mb-1">
            Involved Company IDs (comma-separated)
          </label>
          <input
            type="text"
            value={companyIdsText}
            onChange={(e) => setCompanyIdsText(e.target.value)}
            placeholder="cmp_abc123, cmp_xyz789"
            className="w-full bg-black border border-white/10 text-white text-sm rounded px-3 py-2"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Tip: copy company IDs from the company-profiles admin or the AI suggestions field.
          </p>
        </section>

        {/* Full analysis */}
        <section className="card p-5">
          <label className="block text-xs text-slate-400 mb-1">
            Full Analysis (Markdown) *
          </label>
          <textarea
            required
            value={fullAnalysis}
            onChange={(e) => setFullAnalysis(e.target.value)}
            placeholder="## Mission Profile&#10;..."
            className="w-full bg-black border border-white/10 text-white text-sm font-mono rounded px-3 py-2 min-h-[260px]"
          />
        </section>

        {/* Publish toggle */}
        <section className="card p-5">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={publishImmediately}
              onChange={(e) => setPublishImmediately(e.target.checked)}
            />
            Publish immediately (notifies followers of involved companies)
          </label>
        </section>

        {/* Messages */}
        {error && (
          <div className="card p-4 border-red-500/30 text-sm text-red-300">{error}</div>
        )}
        {info && !error && (
          <div className="card p-4 border-emerald-500/30 text-sm text-emerald-300">{info}</div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/mission-debriefs/admin"
            className="text-sm text-slate-400 hover:text-white px-4 py-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="text-sm bg-white text-black rounded px-5 py-2 hover:bg-slate-200 disabled:opacity-50"
          >
            {saving ? 'Saving…' : publishImmediately ? 'Save & Publish' : 'Save Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
