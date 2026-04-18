'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const TOPICS = [
  { value: 'orbital-mechanics', label: 'Orbital Mechanics' },
  { value: 'space-law', label: 'Space Law' },
  { value: 'propulsion', label: 'Propulsion' },
  { value: 'supply-chain', label: 'Supply Chain' },
  { value: 'startup-finance', label: 'Startup Finance' },
  { value: 'gnc', label: 'GNC (Guidance, Navigation, Control)' },
  { value: 'rocket-equation', label: 'Rocket Equation' },
  { value: 'space-policy', label: 'Space Policy' },
  { value: 'satellite-systems', label: 'Satellite Systems' },
  { value: 'space-medicine', label: 'Space Medicine' },
  { value: 'mission-design', label: 'Mission Design' },
  { value: 'earth-observation', label: 'Earth Observation' },
  { value: 'communications', label: 'Communications' },
  { value: 'cislunar', label: 'Cislunar' },
  { value: 'deep-space', label: 'Deep Space' },
  { value: 'general', label: 'General' },
];

const CADENCES = [
  { value: '', label: 'No fixed cadence' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'adhoc', label: 'Ad hoc' },
];

export default function NewStudyGroupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('orbital-mechanics');
  const [meetingCadence, setMeetingCadence] = useState('');
  const [memberLimit, setMemberLimit] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-3">
            Sign in required
          </h1>
          <p className="text-slate-400 mb-6">
            You need to sign in to create a study group.
          </p>
          <Link
            href="/auth/signin?callbackUrl=/study-groups/new"
            className="inline-block px-5 py-2 rounded-md bg-indigo-500 hover:bg-indigo-400 text-white font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        topic,
        isPrivate,
      };
      if (meetingCadence) body.meetingCadence = meetingCadence;
      if (memberLimit.trim()) {
        const n = parseInt(memberLimit, 10);
        if (!Number.isNaN(n)) body.memberLimit = n;
      }
      const res = await fetch('/api/study-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message || 'Failed to create group');
        setSubmitting(false);
        return;
      }
      router.push(`/study-groups/${json.data.slug}`);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/study-groups"
          className="text-sm text-slate-400 hover:text-white inline-block mb-4"
        >
          ← All study groups
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Start a study group</h1>
        <p className="text-slate-400 mb-8">
          Create a focused space for peers to learn together on a topic.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Group name
            </label>
            <input
              required
              minLength={3}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Orbital Mechanics 101"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              required
              minLength={20}
              maxLength={3000}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              placeholder="What will the group learn together? Who is it for?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              >
                {TOPICS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Meeting cadence
              </label>
              <select
                value={meetingCadence}
                onChange={(e) => setMeetingCadence(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              >
                {CADENCES.map((c) => (
                  <option key={c.value || 'none'} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Member limit (optional)
              </label>
              <input
                type="number"
                min={2}
                max={500}
                value={memberLimit}
                onChange={(e) => setMemberLimit(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                placeholder="No limit"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-white/20 bg-slate-900"
                />
                Private group (invite-only)
              </label>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-md bg-indigo-500 hover:bg-indigo-400 text-white font-medium disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create group'}
            </button>
            <Link
              href="/study-groups"
              className="px-5 py-2 rounded-md bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
