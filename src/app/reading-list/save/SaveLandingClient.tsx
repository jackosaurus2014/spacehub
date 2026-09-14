'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { isSaved, toggleSaved, saveToAccount } from '@/lib/reading-list';

/**
 * Landing page for the "Save" links in the digest emails.
 *
 * Email clients cannot run our JavaScript and a GET must not mutate the
 * account, so the link carries the article in the query string and the save
 * happens here, on arrival: localStorage always, plus the account when the
 * visitor happens to be signed in. That makes the email save work for a
 * signed-out reader exactly as the button on a card does.
 */
export default function SaveLandingClient() {
  const params = useSearchParams();
  const url = params.get('url') || '';
  const title = params.get('title') || url;
  const source = params.get('source') || '';
  const category = params.get('category') || '';

  const [state, setState] = useState<'working' | 'saved' | 'already' | 'invalid'>('working');

  useEffect(() => {
    if (!url) {
      setState('invalid');
      return;
    }
    if (isSaved(url)) {
      // Already in the browser list — still make sure the account has it.
      void saveToAccount({ title, url, source, category });
      setState('already');
      return;
    }
    toggleSaved({ title, url, source, category });
    setState('saved');
  }, [url, title, source, category]);

  return (
    <main className="min-h-screen bg-black px-4 py-16">
      <div className="container mx-auto max-w-lg text-center">
        {state === 'invalid' ? (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Nothing to save</h1>
            <p className="text-slate-400 mb-6">
              That link did not carry an article with it. Nothing was changed.
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2" aria-live="polite">
              {state === 'already' ? 'Already on your reading list' : 'Saved to your reading list'}
            </h1>
            <p className="text-slate-300 mb-1 break-words">{title}</p>
            {source && <p className="text-xs text-slate-500 mb-6">{source}</p>}
          </>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <Link href="/reading-list" className="btn-primary px-4 py-2 rounded-lg text-sm">
            Open reading list
          </Link>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-sm border border-white/15 text-slate-300 hover:text-white hover:border-white/30"
            >
              Read it now
            </a>
          )}
          <Link href="/news" className="text-sm text-slate-400 hover:text-white">
            Back to news
          </Link>
        </div>

        <p className="text-xs text-slate-500 mt-8">
          Saved articles live in this browser. Sign in and your reading list follows you between devices.
        </p>
      </div>
    </main>
  );
}
