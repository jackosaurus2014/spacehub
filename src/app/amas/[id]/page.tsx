'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';
import { toast } from '@/lib/toast';

export const dynamic = 'force-dynamic';

interface Question {
  id: string;
  body: string;
  upvotes: number;
  answered: boolean;
  answerText: string | null;
  answeredAt: string | null;
  createdAt: string;
  askerId: string;
  asker: { id: string; name: string | null; image: string | null } | null;
}

interface SessionData {
  session: {
    id: string;
    hostUserId: string;
    sessionType: string;
    title: string;
    description: string;
    scheduledAt: string;
    durationMin: number;
    maxAttendees: number | null;
    attendeeCount: number;
    streamUrl: string | null;
    recordingUrl: string | null;
    status: string;
    tags: string[];
  };
  host: { id: string; name: string | null; verifiedBadge: string | null } | null;
  questions: Question[];
  rsvpCount: number;
  userRsvp: { id: string } | null;
  isHost: boolean;
}

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) {
        if (res.status === 404) setError('Session not found');
        else setError('Failed to load session');
        return;
      }
      const json = await res.json();
      setData(json?.data || null);
    } catch (err) {
      clientLogger.error('Failed to load session', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRsvp = useCallback(async () => {
    if (!id) return;
    const alreadyRsvp = Boolean(data?.userRsvp);
    try {
      const res = await fetch(`/api/sessions/${id}/rsvp`, {
        method: alreadyRsvp ? 'DELETE' : 'POST',
      });
      if (res.status === 401) {
        toast.error('Please sign in to RSVP');
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        toast.error(j?.error?.message || 'Failed to update RSVP');
        return;
      }
      toast.success(alreadyRsvp ? 'RSVP cancelled' : 'You are RSVPed');
      await load();
    } catch (err) {
      clientLogger.error('RSVP error', {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Failed to update RSVP');
    }
  }, [id, data, router, load]);

  const handleSubmitQuestion = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id || !questionInput.trim()) return;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/sessions/${id}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: questionInput }),
        });
        if (res.status === 401) {
          toast.error('Please sign in to ask a question');
          router.push('/login');
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          toast.error(j?.error?.message || 'Failed to submit question');
          return;
        }
        setQuestionInput('');
        toast.success('Question submitted');
        await load();
      } catch (err) {
        clientLogger.error('Submit question error', {
          error: err instanceof Error ? err.message : String(err),
        });
        toast.error('Failed to submit question');
      } finally {
        setSubmitting(false);
      }
    },
    [id, questionInput, router, load]
  );

  const handleUpvote = useCallback(
    async (qid: string) => {
      if (!id) return;
      try {
        const res = await fetch(
          `/api/sessions/${id}/questions/${qid}/upvote`,
          { method: 'POST' }
        );
        if (res.status === 401) {
          toast.error('Please sign in to upvote');
          return;
        }
        if (!res.ok) {
          toast.error('Failed to upvote');
          return;
        }
        await load();
      } catch (err) {
        clientLogger.error('Upvote error', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [id, load]
  );

  const handleAnswer = useCallback(
    async (qid: string) => {
      if (!id) return;
      const answerText = window.prompt('Answer text (optional):') || '';
      try {
        const res = await fetch(
          `/api/sessions/${id}/questions/${qid}/answer`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answered: true,
              ...(answerText ? { answerText } : {}),
            }),
          }
        );
        if (!res.ok) {
          toast.error('Failed to mark answered');
          return;
        }
        toast.success('Marked answered');
        await load();
      } catch (err) {
        clientLogger.error('Answer error', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [id, load]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center flex-col gap-3">
        <div>{error || 'Session not found'}</div>
        <Link href="/amas" className="underline text-sm">
          Back to sessions
        </Link>
      </div>
    );
  }

  const { session, host, questions, rsvpCount, userRsvp, isHost } = data;
  const embedUrl = session.streamUrl ? getEmbedUrl(session.streamUrl) : null;
  const recordingEmbed = session.recordingUrl
    ? getEmbedUrl(session.recordingUrl)
    : null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/amas" className="text-xs text-white/60 hover:text-white">
          ← All sessions
        </Link>

        <div className="mt-4 mb-6">
          <div className="text-xs uppercase tracking-wide text-white/60 mb-2 flex gap-2">
            <span className="px-2 py-0.5 border border-white/20 rounded">
              {session.sessionType}
            </span>
            <span>{session.status}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {session.title}
          </h1>
          <div className="text-sm text-white/70">
            {new Date(session.scheduledAt).toLocaleString()} •{' '}
            {session.durationMin} min
            {host?.name ? ` • Hosted by ${host.name}` : ''}
          </div>
        </div>

        {(embedUrl || recordingEmbed) && (
          <div className="aspect-video w-full mb-6 bg-black border border-white/10 rounded overflow-hidden">
            <iframe
              src={(recordingEmbed || embedUrl) as string}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {session.streamUrl && !embedUrl && !recordingEmbed && (
          <a
            href={session.streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mb-6 px-4 py-2 bg-white text-black rounded text-sm font-semibold"
          >
            Open stream ↗
          </a>
        )}

        <p className="text-white/80 whitespace-pre-wrap mb-6">
          {session.description}
        </p>

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={handleRsvp}
            className={
              userRsvp
                ? 'px-4 py-2 border border-white/30 rounded text-sm hover:border-white/60 transition'
                : 'px-4 py-2 bg-white text-black rounded text-sm font-semibold hover:bg-white/90 transition'
            }
          >
            {userRsvp ? 'Cancel RSVP' : 'RSVP'}
          </button>
          <span className="text-sm text-white/60">
            {rsvpCount} RSVPed
            {session.maxAttendees ? ` / ${session.maxAttendees}` : ''}
          </span>
        </div>

        <section className="border-t border-white/10 pt-8">
          <h2 className="text-xl font-semibold mb-4">Questions</h2>

          <form onSubmit={handleSubmitQuestion} className="mb-6">
            <textarea
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Ask a question…"
              rows={3}
              maxLength={1000}
              className="w-full bg-black border border-white/20 rounded p-3 text-sm text-white placeholder-white/40 focus:border-white/50 outline-none"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-white/40">
                {questionInput.length}/1000
              </span>
              <button
                type="submit"
                disabled={submitting || !questionInput.trim()}
                className="px-3 py-1.5 bg-white text-black rounded text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>

          {questions.length === 0 ? (
            <div className="text-sm text-white/60">
              No questions yet — be the first to ask!
            </div>
          ) : (
            <ul className="space-y-3">
              {questions.map((q) => (
                <li
                  key={q.id}
                  className="border border-white/10 rounded p-4 bg-black/40"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleUpvote(q.id)}
                      className="flex flex-col items-center gap-0.5 px-2 py-1 border border-white/15 rounded hover:border-white/40 transition min-w-[44px]"
                      aria-label="Upvote"
                    >
                      <span className="text-xs">▲</span>
                      <span className="text-sm font-semibold">
                        {q.upvotes}
                      </span>
                    </button>
                    <div className="flex-1">
                      <p className="text-sm text-white whitespace-pre-wrap">
                        {q.body}
                      </p>
                      <div className="text-xs text-white/50 mt-1">
                        {q.asker?.name || 'Anonymous'} •{' '}
                        {new Date(q.createdAt).toLocaleDateString()}
                        {q.answered && (
                          <span className="ml-2 text-green-400">Answered</span>
                        )}
                      </div>
                      {q.answered && q.answerText && (
                        <div className="mt-2 text-sm text-white/80 border-l-2 border-white/30 pl-3">
                          {q.answerText}
                        </div>
                      )}
                      {isHost && !q.answered && (
                        <button
                          onClick={() => handleAnswer(q.id)}
                          className="mt-2 text-xs underline text-white/60 hover:text-white"
                        >
                          Mark answered
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
