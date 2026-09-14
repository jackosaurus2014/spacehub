'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';

interface AnchorState {
  exists: boolean;
  threadId?: string;
  url?: string;
  postCount?: number;
  isLocked?: boolean;
}

/**
 * "Discuss this" — the bridge from a page that already has readers to the
 * forum that does not yet.
 *
 * Drop it on a launch page, a company profile or a guide. If a discussion
 * already exists it links straight to it with a live reply count; if not, it
 * offers to open one, and the thread is created WITH the reader's first post
 * in it. Nothing is ever created just by viewing a page — that is what keeps
 * 253 company profiles from becoming 253 empty threads.
 */
export default function DiscussThis({
  anchorType,
  anchorKey,
  subjectLabel,
  className = '',
}: {
  anchorType: 'launch' | 'company' | 'guide';
  anchorKey: string;
  /** What the reader is discussing, for the heading and the placeholder. */
  subjectLabel: string;
  className?: string;
}) {
  const { data: session, status } = useSession();
  const [anchor, setAnchor] = useState<AnchorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaId = useId();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({ type: anchorType, key: anchorKey });
        const res = await fetch(`/api/forums/anchor?${params}`);
        if (!res.ok) throw new Error('lookup failed');
        const json = await res.json();
        if (!cancelled) setAnchor(json.data ?? { exists: false });
      } catch {
        // A failed lookup must not break the host page. Fall back to the
        // "start a discussion" state — the POST is idempotent, so a reader
        // who posts from here still lands in the right thread.
        if (!cancelled) setAnchor({ exists: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [anchorType, anchorKey]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const body = content.trim();
      if (!body) return;

      setSubmitting(true);
      try {
        const res = await fetch('/api/forums/anchor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anchorType, anchorKey, content: body }),
        });
        const json = await res.json().catch(() => ({}));

        if (res.ok) {
          toast.success('Posted');
          setContent('');
          setComposing(false);
          setAnchor({
            exists: true,
            threadId: json.data?.threadId,
            url: json.data?.url,
            postCount: (anchor?.postCount ?? 0) + 1,
          });
        } else {
          const msg =
            typeof json.error === 'string'
              ? json.error
              : json.error?.message || 'Could not post that.';
          toast.error(msg);
        }
      } catch {
        toast.error('Network error. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [content, anchorType, anchorKey, anchor?.postCount]
  );

  if (loading) {
    return (
      <div className={`card p-5 ${className}`}>
        <p className="text-sm text-slate-500">Checking for a discussion…</p>
      </div>
    );
  }

  const count = anchor?.postCount ?? 0;

  return (
    <section aria-labelledby="discuss-this-heading" className={`card p-5 ${className}`}>
      <h2 id="discuss-this-heading" className="text-base font-semibold text-white mb-1">
        Discussion
      </h2>

      {anchor?.exists && anchor.url ? (
        <>
          <p className="text-sm text-slate-400 mb-3">
            {count === 0
              ? 'A thread is open for this. No replies yet — be the first.'
              : `${count} ${count === 1 ? 'reply' : 'replies'} in the forum.`}
          </p>
          <Link
            href={anchor.url}
            className="inline-flex items-center gap-1 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            {count === 0 ? 'Open the thread' : 'Join the discussion'}
            <span aria-hidden="true">→</span>
          </Link>
        </>
      ) : status === 'authenticated' && session?.user ? (
        composing ? (
          <form onSubmit={submit}>
            <label htmlFor={textareaId} className="block text-sm text-slate-400 mb-2">
              Start the discussion about {subjectLabel}
            </label>
            <textarea
              id={textareaId}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={10000}
              required
              placeholder="What do you make of it?"
              className="w-full bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/30 outline-none resize-y"
            />
            <div className="flex gap-2 mt-3">
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting…' : 'Post'}
              </button>
              <button
                type="button"
                onClick={() => setComposing(false)}
                className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white/80 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-3">
              No discussion yet. Open one and it becomes the standing thread for {subjectLabel}.
            </p>
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              Start the discussion
            </button>
          </>
        )
      ) : (
        <>
          <p className="text-sm text-slate-400 mb-3">
            No discussion yet. Sign in to start one.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            Sign in
          </Link>
        </>
      )}
    </section>
  );
}
