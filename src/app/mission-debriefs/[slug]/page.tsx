'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { clientLogger } from '@/lib/client-logger';

export const dynamic = 'force-dynamic';

interface TimelineItem {
  t: string;
  label: string;
  note?: string;
}

interface SourceItem {
  url: string;
  title: string;
}

interface CompanyDetail {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  sector: string | null;
  tier: number | null;
}

interface EventDetail {
  id: string;
  name: string;
  launchDate: string | null;
  status: string;
  rocket: string | null;
  location: string | null;
  agency: string | null;
  missionPatchUrl: string | null;
  imageUrl: string | null;
}

interface DebriefDetail {
  id: string;
  slug: string;
  eventId: string | null;
  missionName: string;
  missionDate: string;
  status: 'success' | 'partial' | 'failure' | 'scrubbed';
  executiveSummary: string;
  timeline: TimelineItem[] | null;
  costsEstimate: number | null;
  currency: string | null;
  companyIds: string[];
  keyTakeaways: string[];
  sources: SourceItem[] | null;
  fullAnalysis: string;
  generatedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS = {
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  partial: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  failure: 'bg-red-500/15 text-red-300 border-red-500/30',
  scrubbed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
} as const;

const STATUS_LABELS = {
  success: 'Mission Success',
  partial: 'Partial Success',
  failure: 'Mission Failure',
  scrubbed: 'Scrubbed',
} as const;

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatCurrency(value: number | null, currency: string | null): string {
  if (value === null || value === undefined) return '—';
  const c = currency || 'USD';
  if (value >= 1_000_000_000) return `${c} ${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${c} ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${c} ${(value / 1_000).toFixed(0)}K`;
  return `${c} ${value.toLocaleString()}`;
}

// Extremely lightweight markdown rendering — headings + paragraphs + lists.
// Avoids pulling in a markdown lib for what is largely AI-generated text.
function renderMarkdown(md: string): React.ReactNode {
  const lines = md.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let para: string[] = [];

  function flushPara() {
    if (para.length > 0) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="text-slate-300 text-sm leading-relaxed mb-4">
          {para.join(' ')}
        </p>
      );
      para = [];
    }
  }
  function flushBullets() {
    if (bullets.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-5 mb-4 space-y-1">
          {bullets.map((b, i) => (
            <li key={i} className="text-sm text-slate-300">{b}</li>
          ))}
        </ul>
      );
      bullets = [];
    }
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushBullets();
      continue;
    }
    if (line.startsWith('## ')) {
      flushPara();
      flushBullets();
      blocks.push(
        <h3 key={`h-${blocks.length}`} className="text-lg font-semibold text-white mt-6 mb-3">
          {line.slice(3)}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushPara();
      flushBullets();
      blocks.push(
        <h2 key={`h-${blocks.length}`} className="text-xl font-bold text-white mt-6 mb-3">
          {line.slice(2)}
        </h2>
      );
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      bullets.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }
    flushBullets();
    para.push(line);
  }
  flushPara();
  flushBullets();
  return blocks;
}

export default function MissionDebriefDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [debrief, setDebrief] = useState<DebriefDetail | null>(null);
  const [companies, setCompanies] = useState<CompanyDetail[]>([]);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/mission-debriefs/${slug}`);
        if (res.status === 404) {
          if (!cancelled) setError('Mission debrief not found.');
          return;
        }
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setDebrief(data.debrief);
        setCompanies(data.companies || []);
        setEvent(data.event || null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load mission debrief';
        if (!cancelled) setError(msg);
        clientLogger.error('mission-debrief detail load failed', { slug, error: msg });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl text-center text-slate-500 text-sm">
        Loading mission debrief…
      </div>
    );
  }
  if (error || !debrief) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">🛰️</div>
          <p className="text-slate-300 mb-4">{error || 'Debrief not available.'}</p>
          <Link href="/mission-debriefs" className="text-sm text-slate-400 hover:text-white">
            ← Back to all debriefs
          </Link>
        </div>
      </div>
    );
  }

  const timeline = Array.isArray(debrief.timeline) ? debrief.timeline : [];
  const sources = Array.isArray(debrief.sources) ? debrief.sources : [];

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      {/* Back link */}
      <Link
        href="/mission-debriefs"
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← All Mission Debriefs
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span
            className={`text-xs uppercase tracking-wider px-2.5 py-1 rounded border ${STATUS_COLORS[debrief.status]}`}
          >
            {STATUS_LABELS[debrief.status]}
          </span>
          <span className="text-sm text-slate-400">{formatDate(debrief.missionDate)}</span>
          {debrief.generatedBy === 'claude' && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
              AI-augmented
            </span>
          )}
          {!debrief.publishedAt && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Draft
            </span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
          {debrief.missionName}
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10 text-sm">
          <div>
            <div className="text-xs text-slate-500 mb-1">Estimated Cost</div>
            <div className="text-slate-200 font-medium">
              {formatCurrency(debrief.costsEstimate, debrief.currency)}
            </div>
          </div>
          {event?.agency && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Agency / Operator</div>
              <div className="text-slate-200 font-medium">{event.agency}</div>
            </div>
          )}
          {event?.rocket && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Vehicle</div>
              <div className="text-slate-200 font-medium">{event.rocket}</div>
            </div>
          )}
          {event?.location && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Launch Site</div>
              <div className="text-slate-200 font-medium">{event.location}</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Executive Summary */}
      <section className="card p-6 mb-6">
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <span>📋</span> Executive Summary
        </h2>
        <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
          {debrief.executiveSummary}
        </div>
      </section>

      {/* Key Takeaways */}
      {debrief.keyTakeaways.length > 0 && (
        <section className="card p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <span>💡</span> Key Takeaways
          </h2>
          <ul className="space-y-2">
            {debrief.keyTakeaways.map((k, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="text-slate-500 shrink-0">•</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <section className="card p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <span>⏱️</span> Mission Timeline
          </h2>
          <ol className="relative border-l border-white/10 pl-6 space-y-4">
            {timeline.map((item, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-slate-600 border-2 border-black" />
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-mono text-slate-400 shrink-0 w-20">
                    {item.t}
                  </span>
                  <span className="text-sm text-white font-medium">{item.label}</span>
                </div>
                {item.note && (
                  <div className="text-xs text-slate-400 mt-0.5 ml-[92px]">{item.note}</div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Linked Companies */}
      {companies.length > 0 && (
        <section className="card p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <span>🏢</span> Companies Involved
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {companies.map((c) => (
              <Link
                key={c.id}
                href={`/company-profiles/${c.slug}`}
                className="flex items-center gap-3 p-3 rounded border border-white/10 hover:border-white/30 transition-colors"
              >
                {c.logoUrl ? (
                  <Image
                    src={c.logoUrl}
                    alt={c.name}
                    width={32}
                    height={32}
                    className="rounded shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs text-slate-400 shrink-0">
                    {c.name[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{c.name}</div>
                  {c.sector && (
                    <div className="text-[11px] text-slate-500 truncate">{c.sector}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Full Analysis */}
      {debrief.fullAnalysis && (
        <section className="card p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <span>📊</span> Full Analysis
          </h2>
          <div className="prose-invert">{renderMarkdown(debrief.fullAnalysis)}</div>
        </section>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <section className="card p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <span>🔗</span> Sources
          </h2>
          <ul className="space-y-2">
            {sources.map((s, i) => (
              <li key={i} className="text-sm">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white underline-offset-2 hover:underline"
                >
                  {s.title}
                </a>
                <span className="text-xs text-slate-600 ml-2 break-all">{s.url}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer meta */}
      <div className="text-xs text-slate-600 text-center mt-8">
        Last updated {formatDate(debrief.updatedAt)}
        {debrief.generatedBy && <span> · Generated by {debrief.generatedBy}</span>}
      </div>
    </div>
  );
}
