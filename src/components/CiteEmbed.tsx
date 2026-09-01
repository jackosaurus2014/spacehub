'use client';

import { useState } from 'react';

// G1/G3 shared component (growth plan): the "make it citable" affordance.
// Citations are the acquisition engine (the BryceTech lesson) — every data
// page offers a ready-to-paste citation line and an iframe embed that
// carries an attribution backlink.
interface CiteEmbedProps {
  title: string;
  pageUrl: string;      // absolute
  embedUrl?: string;    // absolute; omit to hide the embed block
  sourceLine: string;   // e.g. "SpaceNexus Launch Cadence Index, from Launch Library 2 + SpaceNexus tracking"
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3,#8a8580)]">{label}</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }).catch(() => { /* clipboard unavailable — text stays selectable */ });
          }}
          className="text-[11px] px-2 py-0.5 rounded border border-[var(--line,rgba(255,255,255,0.1))] text-[var(--ember,#FF7A18)] hover:bg-white/[0.04] transition-colors"
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre className="text-[11px] text-white/70 bg-black/40 border border-white/[0.06] rounded p-2 overflow-x-auto whitespace-pre-wrap break-all select-all">{text}</pre>
    </div>
  );
}

export default function CiteEmbed({ title, pageUrl, embedUrl, sourceLine }: CiteEmbedProps) {
  const today = new Date().toISOString().slice(0, 10);
  const citation = `${sourceLine}. ${pageUrl} (retrieved ${today}).`;
  const iframe = embedUrl
    ? `<iframe src="${embedUrl}" width="100%" height="360" frameborder="0" title="${title} — SpaceNexus" loading="lazy"></iframe>\n<p style="font-size:12px"><a href="${pageUrl}">${title}</a> · data by SpaceNexus</p>`
    : null;
  return (
    <details className="rounded-lg border border-[var(--line,rgba(255,255,255,0.08))] bg-white/[0.02] p-3">
      <summary className="cursor-pointer text-sm text-[var(--ember,#FF7A18)] select-none">Cite or embed this data</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <CopyBlock label="Citation" text={citation} />
        {iframe && <CopyBlock label="Embed (iframe)" text={iframe} />}
      </div>
      <p className="mt-2 text-[11px] text-white/40">Free to cite and embed with attribution. Data updates continuously; the citation date pins your retrieval.</p>
    </details>
  );
}
