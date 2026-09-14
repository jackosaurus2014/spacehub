/**
 * Forum anti-abuse guard.
 *
 * A public posting surface with an open sign-up is a link-spam farm within a
 * week unless something stands in the way. The middleware's per-IP sliding
 * window (src/middleware.ts) is the outer wall and it is not enough on its
 * own: a spammer behind one account rotates IPs, and a shared office NAT
 * puts honest readers behind one IP. So this module adds the two things the
 * IP bucket cannot do — per-ACCOUNT pacing, and a look at what is actually
 * being posted.
 *
 * Four layers, in the order a request meets them:
 *
 *   1. Middleware per-IP rate limit         (src/middleware.ts)
 *   2. Ban / mute check                     (src/lib/moderation.ts)
 *   3. Per-account throttle                 (here — postingThrottle)
 *   4. Content inspection                   (here — inspectContent)
 *
 * Nothing here is a silent ban. Every rejection returns a reason the poster
 * can act on, because the failure mode of an over-tuned spam filter is a
 * confused member who never posts again.
 */

import sanitizeHtml from 'sanitize-html';

// ─── Layer 3: per-account throttle ───────────────────────────────────────────
//
// Modelled on src/lib/game/route-throttle.ts, including its two good
// decisions: a rejected hit is NOT recorded (so retrying does not push the
// caller's own retry-after further out), and the key store is capped so a
// flood of accounts cannot grow the map without bound. In-memory and
// per-instance, like every other limiter in this codebase.

interface Bucket {
  hits: number[];
  touched: number;
}

const buckets = new Map<string, Bucket>();

export const FORUM_THROTTLE_MAX_KEYS = 20_000;

export interface ThrottleRule {
  max: number;
  windowMs: number;
}

/**
 * Posting budgets per account. Generous enough that a member in an active
 * conversation never notices, tight enough that a bot cannot seed a hundred
 * backlinks before anyone wakes up.
 */
export const FORUM_THROTTLES: Record<string, ThrottleRule> = {
  /** New threads are the expensive object — each one is a new indexable page. */
  thread: { max: 5, windowMs: 60 * 60 * 1000 },
  /** Replies are the cheap one; a good argument runs long. */
  reply: { max: 30, windowMs: 60 * 60 * 1000 },
  /** Edits, to stop an edit loop being used to churn a page's content. */
  edit: { max: 40, windowMs: 60 * 60 * 1000 },
  /** Anchor creation — opening a thread on a company or guide page. */
  anchor: { max: 5, windowMs: 60 * 60 * 1000 },
}

export interface ThrottleDecision {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function postingThrottle(
  userId: string,
  action: keyof typeof FORUM_THROTTLES | string,
  nowMs: number = Date.now()
): ThrottleDecision {
  const rule = FORUM_THROTTLES[action] ?? FORUM_THROTTLES.reply;
  const key = `${userId}:${action}`;

  if (buckets.size > FORUM_THROTTLE_MAX_KEYS) {
    // Evict the coldest half rather than clearing everything, so an eviction
    // never hands an active spammer a clean slate.
    const entries = Array.from(buckets.entries()).sort((a, b) => a[1].touched - b[1].touched);
    for (let i = 0; i < entries.length / 2; i++) buckets.delete(entries[i][0]);
  }

  const bucket = buckets.get(key) ?? { hits: [], touched: nowMs };
  const windowStart = nowMs - rule.windowMs;
  const hits = bucket.hits.filter((t) => t > windowStart);

  if (hits.length >= rule.max) {
    // Do not record the rejected attempt.
    buckets.set(key, { hits, touched: nowMs });
    const retryAfterMs = Math.max(1000, hits[0] + rule.windowMs - nowMs);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  hits.push(nowMs);
  buckets.set(key, { hits, touched: nowMs });
  return { allowed: true, remaining: rule.max - hits.length, retryAfterMs: 0 };
}

/** Test seam. */
export function __resetForumThrottle(): void {
  buckets.clear();
}

/** Test seam. */
export function __forumThrottleSize(): number {
  return buckets.size;
}

// ─── Layer 4: content inspection ─────────────────────────────────────────────

/**
 * Forum bodies are stored as Markdown SOURCE, not HTML, and rendered through
 * react-markdown without rehype-raw — so raw HTML in a body is already inert
 * at render time. Stripping it on the way IN as well is defence in depth
 * against the next renderer someone wires up (an email digest, an RSS feed, a
 * JSON-LD block) forgetting that rule. This is the same all-tags-stripped
 * config the RSS fetchers use.
 */
const STRIP_ALL_HTML: sanitizeHtml.IOptions = { allowedTags: [], allowedAttributes: {} };

/**
 * Sanitise a body for storage. Strips every HTML tag, normalises line
 * endings, collapses runs of blank lines (a common way to push a spam link
 * below the fold of a preview), and trims.
 *
 * Note the disallowDeep entity decoding behaviour of sanitize-html: it
 * decodes entities as it strips, so `&lt;script&gt;` does not survive as a
 * tag that a later renderer could re-encode into life.
 */
export function sanitizeForumBody(raw: string): string {
  return sanitizeHtml(raw, STRIP_ALL_HTML)
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/** Sanitise a thread title — always single-line, never marked up. */
export function sanitizeForumTitle(raw: string): string {
  return sanitizeHtml(raw, STRIP_ALL_HTML).replace(/\s+/g, ' ').trim();
}

const URL_RE = /https?:\/\/[^\s<>()[\]]+/gi;

export function countLinks(body: string): number {
  return (body.match(URL_RE) || []).length;
}

export function extractHosts(body: string): string[] {
  const hosts: string[] = [];
  for (const url of body.match(URL_RE) || []) {
    try {
      hosts.push(new URL(url).hostname.replace(/^www\./, '').toLowerCase());
    } catch {
      // Unparseable — countLinks already counted it; host analysis skips it.
    }
  }
  return hosts;
}

export interface ContentVerdict {
  ok: boolean;
  /** Message shown to the poster. Never leaks which rule fired internally. */
  reason?: string;
}

/**
 * Posting budget for accounts young enough to be throwaways. A spam run buys
 * nothing if the first hour of an account cannot carry links.
 */
export const NEW_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;
export const NEW_ACCOUNT_MAX_LINKS = 1;
export const MAX_LINKS = 8;
export const MAX_LINK_DENSITY = 0.25;
export const MIN_BODY_LENGTH = 2;

export interface InspectOptions {
  /** When the posting account was created, for the young-account rules. */
  accountCreatedAt?: Date | null;
  /** Titles get a tighter link policy than bodies — they carry no context. */
  isTitle?: boolean;
  now?: Date;
}

/**
 * Look at what is being posted. Cheap, synchronous, no network, no model
 * call — this runs on every write, so it has to be free.
 *
 * What it is NOT: a judgement about whether an argument is any good. Every
 * rule here is about mechanical spam shape (link stuffing, throwaway
 * accounts, repetition, shouting), never about opinion. Moderation of
 * content is a human decision made through ContentReport.
 */
export function inspectContent(body: string, opts: InspectOptions = {}): ContentVerdict {
  const text = body.trim();

  if (text.length < MIN_BODY_LENGTH) {
    return { ok: false, reason: 'That is too short to post.' };
  }

  const links = countLinks(text);

  if (links > MAX_LINKS) {
    return {
      ok: false,
      reason: `That has ${links} links in it. Please keep a post under ${MAX_LINKS} — quote the relevant bit instead.`,
    };
  }

  // Link density: a post that is mostly URL is an advert regardless of how
  // many links it holds. Measured against the non-link text, so a long,
  // substantial post carrying several sources passes.
  if (links > 0) {
    const linkChars = (text.match(URL_RE) || []).join('').length;
    if (linkChars / text.length > MAX_LINK_DENSITY && text.length < 2000) {
      return {
        ok: false,
        reason: 'That post is mostly links. Please add some context around them.',
      };
    }
  }

  const createdAt = opts.accountCreatedAt;
  if (createdAt && links > NEW_ACCOUNT_MAX_LINKS) {
    const ageMs = (opts.now ?? new Date()).getTime() - createdAt.getTime();
    if (ageMs < NEW_ACCOUNT_AGE_MS) {
      return {
        ok: false,
        reason:
          'New accounts can include one link per post for the first day. Post without the links and add them once you have been around a little longer.',
      };
    }
  }

  if (opts.isTitle && links > 0) {
    return { ok: false, reason: 'Please keep links out of the title.' };
  }

  // The same host repeated many times in one post is an advert, not a source.
  const hosts = extractHosts(text);
  if (hosts.length >= 4) {
    const counts = new Map<string, number>();
    for (const h of hosts) counts.set(h, (counts.get(h) || 0) + 1);
    for (const [, n] of counts) {
      if (n >= 4) {
        return { ok: false, reason: 'That links the same site several times over. One is enough.' };
      }
    }
  }

  // Shouting. Only applies past a length where it cannot be an acronym
  // ("NASA ULA NSSL RFP" is a legitimate short post).
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (letters.length > 40) {
    const upper = (text.match(/[A-Z]/g) || []).length;
    if (upper / letters.length > 0.7) {
      return { ok: false, reason: 'Please do not post in all capitals.' };
    }
  }

  // A single character or short token repeated to pad length.
  if (/(.)\1{30,}/.test(text)) {
    return { ok: false, reason: 'That looks like repeated filler.' };
  }

  return { ok: true };
}

/**
 * Turn validateBody's error map into one sentence a poster can act on.
 *
 * validateBody returns { field: [messages] }, and handing that back as a bare
 * "Validation failed" tells the poster nothing about WHICH field is wrong —
 * they retype the whole post guessing. The field name is kept in the message
 * because forum writes carry several fields (title, content, tags) and the
 * error is useless without knowing which one it is about.
 */
export function validationMessage(
  errors: Record<string, string[]>,
  fallback = 'Validation failed'
): string {
  const first = Object.entries(errors)[0];
  if (!first || !first[1]?.[0]) return fallback;
  const [field, messages] = first;
  return field && field !== 'value' ? `${field}: ${messages[0]}` : messages[0];
}

/**
 * Whether two bodies are the same post. Used to stop a double-submit (or a
 * bot) putting the identical body in five threads. Compared on normalised
 * text so whitespace and case games do not defeat it.
 */
export function isDuplicateBody(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const na = norm(a);
  const nb = norm(b);
  // Very short posts legitimately repeat ("agreed", "thanks") — only treat
  // substantial bodies as duplicates.
  if (na.length < 40) return false;
  return na === nb;
}
