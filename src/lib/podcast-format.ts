/**
 * Podcast presentation helpers shared by the /podcasts hub, show and episode
 * pages (2026-09-01). Server-safe: pure functions, no state.
 *
 * Every string that reaches these helpers originated in a third-party RSS
 * feed (see src/lib/podcast-sync.ts, which already strips tags on ingest).
 * The helpers here strip AGAIN before render so a future ingest change can
 * never leak feed HTML into a page: text goes through `stripToText`, the
 * one place that renders markup (`sanitizeEpisodeDescription`) allows
 * paragraphs, line breaks and https links only.
 */

import sanitizeHtml from 'sanitize-html';

/** Category chip classes — one palette for the hub cards and the show page. */
export const PODCAST_CATEGORY_COLORS: Record<string, string> = {
  industry: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  science: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  exploration: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  business: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  engineering: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  policy: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  education: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  interviews: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  news: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  general: 'bg-white/10 text-slate-300 border-white/20',
  ai: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
};

export function podcastCategoryClass(category: string | null | undefined): string {
  return PODCAST_CATEGORY_COLORS[category || 'general'] || PODCAST_CATEGORY_COLORS.general;
}

/** Feed text → plain text: every tag removed, entities decoded, whitespace collapsed. */
export function stripToText(raw: string | null | undefined, max = 4000): string {
  if (!raw) return '';
  return sanitizeHtml(String(raw), { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Meta-description length: one sentence-ish, never mid-word when avoidable. */
export function metaDescription(raw: string | null | undefined, fallback: string, max = 160): string {
  const text = stripToText(raw, 1000);
  if (!text) return fallback;
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}

const DESCRIPTION_HTML_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'a'],
  // rel/target must be allow-listed or the transform's additions are stripped.
  // simpleTransform merges over feed-supplied attributes, so the rel/target
  // that survive are always the ones set here.
  allowedAttributes: { a: ['href', 'rel', 'target'] },
  allowedSchemes: ['http', 'https'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener nofollow', target: '_blank' }),
  },
};

/**
 * Episode description → HTML limited to paragraphs, line breaks and links.
 * Returns '' when nothing survives. Output is safe for dangerouslySetInnerHTML.
 */
export function sanitizeEpisodeDescription(raw: string | null | undefined): string {
  if (!raw) return '';
  const html = sanitizeHtml(String(raw), DESCRIPTION_HTML_CONFIG).trim();
  if (!html) return '';
  // Ingest collapses whitespace and strips tags, so most rows arrive as one
  // run of text: wrap it so the prose styles apply uniformly.
  return /<p[\s>]/i.test(html) ? html : `<p>${html}</p>`;
}

/** Split a transcript body into paragraphs (blank-line first, then single newlines). */
export function transcriptParagraphs(body: string): string[] {
  const text = body.replace(/\r\n?/g, '\n').trim();
  if (!text) return [];
  const byBlank = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  return text.split('\n').map((p) => p.trim()).filter(Boolean);
}

/** 3725 → "1h 2m"; 1500 → "25 min"; 45 → "45 sec". Null-safe. */
export function formatDurationSec(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m} min`;
  return `${Math.round(sec)} sec`;
}

/** ISO-8601 duration for schema.org timeRequired: 3725 → "PT1H2M5S". */
export function isoDuration(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${r || (!h && !m) ? `${r}S` : ''}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sep 1, 2026" in UTC — the same date for every viewer and for the crawler. */
export function formatEpisodeDate(d: Date | string | null | undefined, opts: { year?: boolean } = {}): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const withYear = opts.year ?? date.getUTCFullYear() !== new Date().getUTCFullYear();
  const base = `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
  return withYear ? `${base}, ${date.getUTCFullYear()}` : base;
}

/** "S2 · E14", "E14", "S2", or null. */
export function episodeLabel(seasonNumber: number | null | undefined, episodeNumber: number | null | undefined): string | null {
  const parts: string[] = [];
  if (seasonNumber != null) parts.push(`S${seasonNumber}`);
  if (episodeNumber != null) parts.push(`E${episodeNumber}`);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * Feed freshness for the StatusBadge: the cron syncs every 4h, so a feed
 * untouched for more than 12h has missed several cycles.
 */
export function feedStatus(lastFetchedAt: Date | null | undefined): 'live' | 'stale' | 'off' {
  if (!lastFetchedAt) return 'off';
  const age = Date.now() - new Date(lastFetchedAt).getTime();
  return age > 12 * 3600_000 ? 'stale' : 'live';
}
