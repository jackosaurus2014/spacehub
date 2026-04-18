'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EventOption {
  id: string;
  name: string;
  launchDate: string | null;
  rocket?: string | null;
}

type Theme = 'dark' | 'light' | 'minimal' | 'retro';

const THEMES: { value: Theme; label: string; swatch: string }[] = [
  { value: 'dark', label: 'Dark', swatch: 'bg-black border-white/30' },
  { value: 'light', label: 'Light', swatch: 'bg-white border-slate-300' },
  { value: 'minimal', label: 'Minimal', swatch: 'bg-slate-100 border-slate-300' },
  {
    value: 'retro',
    label: 'Retro',
    swatch: 'bg-gradient-to-br from-indigo-950 to-black border-amber-400/60',
  },
];

export default function NewCountdownPage() {
  const router = useRouter();
  const [missionName, setMissionName] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');
  const [eventId, setEventId] = useState<string>('');
  const [events, setEvents] = useState<EventOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/events?hours=2160&limit=50');
        if (!res.ok) return;
        const json = await res.json();
        const list: EventOption[] = json?.data?.events || json?.events || [];
        if (!cancelled) setEvents(list);
      } catch {
        // optional — form still works without event picker
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onEventPick(id: string) {
    setEventId(id);
    const match = events.find((e) => e.id === id);
    if (match) {
      if (match.name && !missionName) setMissionName(match.name);
      if (match.launchDate) {
        // convert ISO to datetime-local value
        const dt = new Date(match.launchDate);
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60_000)
          .toISOString()
          .slice(0, 16);
        setTargetTime(local);
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const isoTarget = targetTime ? new Date(targetTime).toISOString() : '';
      const res = await fetch('/api/countdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionName,
          targetTime: isoTarget,
          theme,
          eventId: eventId || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg =
          json?.error?.message ||
          (typeof json?.error === 'string' ? json.error : null) ||
          'Failed to create countdown';
        throw new Error(msg);
      }

      const slug = json?.data?.slug;
      if (slug) {
        router.push(`/countdown/${slug}`);
      } else {
        router.push('/countdown');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-8 py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/countdown"
          className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white"
        >
          &larr; Countdowns
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mt-4 mb-2">
          Create a Countdown
        </h1>
        <p className="text-white/60 mb-8">
          Build an embeddable mission countdown. You&apos;ll get a shareable link and
          an iframe snippet.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {events.length > 0 && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                Link to a real SpaceEvent (optional)
              </label>
              <select
                value={eventId}
                onChange={(e) => onEventPick(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— None (custom countdown) —</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name}
                    {evt.launchDate
                      ? ` — ${new Date(evt.launchDate).toLocaleDateString()}`
                      : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-white/40 mt-1">
                Picking an event pre-fills the mission name and target time.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="missionName"
              className="block text-xs uppercase tracking-widest text-white/60 mb-2"
            >
              Mission name
            </label>
            <input
              id="missionName"
              type="text"
              required
              maxLength={120}
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              placeholder="e.g. Artemis III"
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="targetTime"
              className="block text-xs uppercase tracking-widest text-white/60 mb-2"
            >
              Target time
            </label>
            <input
              id="targetTime"
              type="datetime-local"
              required
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <fieldset>
            <legend className="block text-xs uppercase tracking-widest text-white/60 mb-2">
              Theme
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {THEMES.map((t) => (
                <label
                  key={t.value}
                  className={`cursor-pointer rounded-xl p-3 border transition-colors ${
                    theme === t.value
                      ? 'border-white bg-white/[0.06]'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={t.value}
                    checked={theme === t.value}
                    onChange={() => setTheme(t.value)}
                    className="sr-only"
                  />
                  <div
                    className={`h-10 rounded-md border mb-2 ${t.swatch}`}
                    aria-hidden
                  />
                  <div className="text-sm">{t.label}</div>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2 text-sm"
            >
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create countdown'}
            </button>
            <Link
              href="/countdown"
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg border border-white/20 hover:bg-white/[0.05] text-sm"
            >
              Cancel
            </Link>
          </div>
          <p className="text-[11px] text-white/40">
            You must be signed in to save a countdown.
          </p>
        </form>
      </div>
    </main>
  );
}
