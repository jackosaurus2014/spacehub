'use client';

import { useEffect, useMemo, useState } from 'react';

interface Props {
  slug: string;
}

export default function ShareControls({ slug }: Props) {
  const [origin, setOrigin] = useState<string>('');
  const [copiedWhich, setCopiedWhich] = useState<'link' | 'iframe' | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const publicLink = useMemo(() => `${origin}/countdown/${slug}`, [origin, slug]);
  const embedUrl = useMemo(() => `${origin}/embed/countdown/${slug}`, [origin, slug]);
  const iframeSnippet = useMemo(
    () =>
      `<iframe src="${embedUrl}" width="100%" height="340" frameborder="0" style="border:0;border-radius:16px;max-width:720px" title="Mission countdown"></iframe>`,
    [embedUrl]
  );

  async function copy(value: string, which: 'link' | 'iframe') {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedWhich(which);
      setTimeout(() => setCopiedWhich(null), 1500);
    } catch {
      // no-op — clipboard may be unavailable in some contexts
    }
  }

  return (
    <section className="mt-10 border border-current/10 rounded-2xl p-6 opacity-90">
      <h3 className="text-xs uppercase tracking-[0.25em] mb-4 opacity-70">
        Share this countdown
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-[11px] uppercase tracking-widest opacity-60 mb-2">
            Public link
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={publicLink}
              className="flex-1 bg-transparent border border-current/20 rounded-lg px-3 py-2 text-sm font-mono"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={() => copy(publicLink, 'link')}
              className="px-4 py-2 rounded-lg border border-current/30 text-sm font-medium hover:bg-current/10"
            >
              {copiedWhich === 'link' ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-widest opacity-60 mb-2">
            Embed snippet
          </label>
          <textarea
            readOnly
            value={iframeSnippet}
            rows={3}
            className="w-full bg-transparent border border-current/20 rounded-lg px-3 py-2 text-sm font-mono resize-none"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={() => copy(iframeSnippet, 'iframe')}
            className="mt-2 px-4 py-2 rounded-lg border border-current/30 text-sm font-medium hover:bg-current/10"
          >
            {copiedWhich === 'iframe' ? 'Copied!' : 'Copy embed code'}
          </button>
        </div>
      </div>
    </section>
  );
}
