/**
 * Launch live-blog entries — validation and shaping, kept out of the route so
 * both halves can be tested without Next's request machinery.
 *
 * Append-only by design: there is a parse-and-create path and nothing else.
 * No edit, no delete. What an operator said at T−4 minutes stays on the record.
 */

export const LIVE_ENTRY_KINDS = ['update', 'milestone', 'hold', 'scrub', 'success'] as const;
export type LiveEntryKind = (typeof LIVE_ENTRY_KINDS)[number];

export const MAX_BODY_LENGTH = 600;
export const MAX_LINK_LABEL_LENGTH = 60;

export interface LiveEntryInput {
  body?: unknown;
  linkUrl?: unknown;
  linkLabel?: unknown;
  imageUrl?: unknown;
  kind?: unknown;
}

export interface ParsedLiveEntry {
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  imageUrl: string | null;
  kind: LiveEntryKind;
}

export type ParseResult =
  | { ok: true; value: ParsedLiveEntry }
  | { ok: false; error: string };

/** Strip tags and collapse whitespace. Entries are plain text, always. */
export function sanitizeText(text: string, maxLen: number): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/** Only absolute http(s) URLs survive; anything else becomes null. */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export function parseLiveEntry(input: LiveEntryInput | null | undefined): ParseResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'A JSON body is required' };

  const rawBody = typeof input.body === 'string' ? input.body : '';
  const body = sanitizeText(rawBody, MAX_BODY_LENGTH);
  if (!body) return { ok: false, error: 'body is required' };

  const kindRaw = typeof input.kind === 'string' ? input.kind.trim().toLowerCase() : 'update';
  const kind = (LIVE_ENTRY_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as LiveEntryKind)
    : 'update';

  const linkUrl = safeUrl(input.linkUrl);
  const linkLabelRaw = typeof input.linkLabel === 'string' ? sanitizeText(input.linkLabel, MAX_LINK_LABEL_LENGTH) : '';
  const linkLabel = linkUrl ? (linkLabelRaw || 'Read more') : null;
  const imageUrl = safeUrl(input.imageUrl);

  return { ok: true, value: { body, linkUrl, linkLabel, imageUrl, kind } };
}

export interface LiveEntryRow {
  id: string;
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  imageUrl: string | null;
  kind: string;
  createdAt: Date | string;
}

export interface SerializedLiveEntry {
  id: string;
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  imageUrl: string | null;
  kind: string;
  /** ISO — the client formats it. */
  at: string;
}

/** Newest first. The order the page renders, decided once, here. */
export function serializeEntries(rows: readonly LiveEntryRow[]): SerializedLiveEntry[] {
  return [...rows]
    .map((r) => ({
      id: r.id,
      body: r.body,
      linkUrl: r.linkUrl,
      linkLabel: r.linkLabel,
      imageUrl: r.imageUrl,
      kind: r.kind,
      at: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
    }))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
