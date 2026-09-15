'use client';

import { useState } from 'react';

/**
 * Registration for a scheduled briefing call.
 *
 * Rendered only when the server has already established that a call exists AND
 * that the visitor holds a Research seat. It is a form, not a gate: the API it
 * posts to re-checks authorization server-side on every request.
 */
export default function CallRegistrationClient({
  callId,
  initiallyRegistered,
  inviteUrl,
}: {
  callId: string;
  initiallyRegistered: boolean;
  inviteUrl: string;
}) {
  const [registered, setRegistered] = useState(initiallyRegistered);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: 'register' | 'cancel') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        action === 'register'
          ? '/api/research/call/register'
          : `/api/research/call/register?callId=${encodeURIComponent(callId)}`,
        {
          method: action === 'register' ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:
            action === 'register'
              ? JSON.stringify({ callId, question: question.trim() || undefined })
              : undefined,
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? 'That did not go through. Try again in a moment.');
        return;
      }
      setRegistered(action === 'register');
    } catch {
      setError('That did not go through. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  if (registered) {
    return (
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-5">
        <p className="text-white font-semibold mb-1">You are registered</p>
        <p className="text-sm text-slate-300 leading-relaxed">
          The joining details are on this page and in the calendar invite. We will email the link before the
          call.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <a
            href={inviteUrl}
            className="btn-primary inline-flex px-4 py-2 rounded-lg text-sm"
            download
          >
            Add to calendar (.ics)
          </a>
          <button
            type="button"
            onClick={() => submit('cancel')}
            disabled={busy}
            className="text-sm text-slate-400 underline hover:text-white disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Cancel my registration'}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-amber-300 mt-3">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit('register');
      }}
    >
      <label htmlFor="call-question" className="block text-sm font-medium text-white mb-1.5">
        A question for the host <span className="text-slate-500 font-normal">(optional)</span>
      </label>
      <textarea
        id="call-question"
        name="question"
        rows={3}
        maxLength={1000}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="What would you like covered?"
        className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
      />
      <p className="text-xs text-slate-500 mt-1.5">
        Questions go to the host before the call. {1000 - question.length} characters left.
      </p>
      <button
        type="submit"
        disabled={busy}
        className="btn-primary inline-flex px-5 py-2.5 rounded-lg text-sm mt-4 disabled:opacity-50"
      >
        {busy ? 'Registering…' : 'Register for this call'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-amber-300 mt-3">
          {error}
        </p>
      )}
    </form>
  );
}
