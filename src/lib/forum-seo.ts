/**
 * Forum SEO policy — one place that decides what a crawler may do with
 * user-generated content.
 *
 * The site earns 362,664 impressions and 2,916 clicks a month on editorial
 * that is fact-checked and dated. A forum is the fastest way to put that at
 * risk: thousands of thin, unreviewed, sometimes wrong pages sharing the
 * domain, competing with the guides for the same queries, and handing
 * PageRank to whatever a spammer links. So the default here is restrictive
 * and a thread has to earn its way into the index.
 *
 * The rules:
 *
 *   - INDEX only what has a discussion in it. An anchor thread with zero
 *     replies is a stub; it is `noindex, follow` so crawlers still walk
 *     through it to the launch or company page it points at, but it never
 *     competes in search. A thread earns `index` at MIN_INDEXABLE_REPLIES.
 *   - SITEMAP only what is indexable. The sitemap is a statement about what
 *     we think is worth crawling; putting stubs in it is noise. This also
 *     keeps the existing mothball guard test honest, which asserts no
 *     sitemap URL resolves to a redirect.
 *   - PAGINATION canonicalises to itself, not to page 1. Google dropped
 *     rel=prev/next years ago, and canonicalising page 3 to page 1 tells it
 *     the replies on page 3 do not exist. Page 1 is the bare URL (no ?page=1)
 *     so one page never has two addresses.
 *   - USER LINKS are `nofollow ugc`, always, including on indexed threads.
 *     That is the single most valuable thing to get right: it removes the
 *     entire economic reason to spam the forum.
 *   - DESCRIPTIONS come from the anchor subject when there is one, never
 *     from the first few words of whatever a user typed. A search snippet
 *     reading "lol same" is worse than no snippet.
 */

/** A thread needs this many replies before it may be indexed. */
export const MIN_INDEXABLE_REPLIES = 2;

/** And this much text in the opening post — a one-liner is not a page. */
export const MIN_INDEXABLE_CONTENT_CHARS = 200;

/** Replies per page in a thread view. */
export const REPLIES_PER_PAGE = 20;

/** Threads per page in a category view. */
export const THREADS_PER_PAGE = 20;

export interface ThreadIndexInput {
  postCount: number;
  contentLength: number;
  isLocked?: boolean;
  /** Anchored threads are stubs until someone replies, regardless of body length. */
  isAnchored?: boolean;
}

/**
 * Whether a thread may be indexed. `follow` is always true — even a stub
 * should pass link equity through to the launch or company page it anchors,
 * and to the category above it.
 */
export function threadIsIndexable(t: ThreadIndexInput): boolean {
  if (t.postCount < MIN_INDEXABLE_REPLIES) return false;
  // An anchored thread's opening post is written by us, so its length proves
  // nothing about whether there is a discussion here. Replies are the test.
  if (t.isAnchored) return true;
  return t.contentLength >= MIN_INDEXABLE_CONTENT_CHARS;
}

/**
 * The `robots` value for a thread's metadata. Returns undefined when the
 * thread is indexable, so the caller spreads nothing and the site default
 * applies — matching the pattern at src/app/space-talent/browse/[slug].
 */
export function threadRobots(
  t: ThreadIndexInput
): { robots: { index: false; follow: true } } | Record<string, never> {
  return threadIsIndexable(t) ? {} : { robots: { index: false, follow: true } };
}

/**
 * Canonical URL for a thread page. Page 1 canonicalises to the bare path;
 * every later page canonicalises to ITSELF, so its replies stay discoverable
 * as their own content instead of being declared duplicates of page 1.
 */
export function threadCanonical(
  baseUrl: string,
  categorySlug: string,
  threadId: string,
  page: number
): string {
  const path = `${baseUrl}/community/forums/${categorySlug}/${threadId}`;
  return page > 1 ? `${path}?page=${page}` : path;
}

/** Same rule for a category listing. */
export function categoryCanonical(baseUrl: string, categorySlug: string, page: number): string {
  const path = `${baseUrl}/community/forums/${categorySlug}`;
  return page > 1 ? `${path}?page=${page}` : path;
}

/**
 * A meta description for a thread.
 *
 * Prefers the anchor subtitle (ours, factual). Falls back to the opening post
 * only for member-authored threads, where the opening post IS the subject —
 * and even then it is stripped of markdown noise and cut on a word boundary
 * rather than mid-word.
 */
export function threadDescription(opts: {
  title: string;
  content: string;
  categoryName: string;
  anchorSubtitle?: string | null;
  postCount: number;
}): string {
  if (opts.anchorSubtitle) {
    const replies =
      opts.postCount === 0
        ? 'No replies yet.'
        : `${opts.postCount} ${opts.postCount === 1 ? 'reply' : 'replies'}.`;
    return truncateOnWord(`${opts.anchorSubtitle} ${replies}`, 160);
  }

  const plain = stripMarkdown(opts.content);
  if (plain.length >= 60) return truncateOnWord(plain, 160);

  return truncateOnWord(
    `${opts.title} — a discussion in ${opts.categoryName} on SpaceNexus.`,
    160
  );
}

/** Markdown source is not a description. Flatten it to readable prose. */
export function stripMarkdown(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateOnWord(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * The rel value for every link inside user-generated content.
 *
 * `ugc` states what it is, `nofollow` removes the SEO payoff for posting it,
 * and `noopener noreferrer` is the ordinary target=_blank hygiene. This is
 * applied by the renderer (src/components/community/MarkdownContent.tsx) to
 * every link in a post body, not by the author.
 */
export const UGC_LINK_REL = 'ugc nofollow noopener noreferrer';

/**
 * A post counts as edited once its body changed meaningfully after posting.
 *
 * The grace window exists for two reasons. updatedAt also moves for things
 * that are not an edit (the thread bump written when a new reply lands), and
 * a typo fixed ten seconds after posting is not what the marker is for. The
 * marker exists so nobody can quietly rewrite a post that has already been
 * replied to — that is a disclosure obligation, not a changelog.
 */
export const EDIT_GRACE_MS = 2 * 60 * 1000;

export function wasEdited(createdAt: Date | string, updatedAt: Date | string): boolean {
  const c = new Date(createdAt).getTime();
  const u = new Date(updatedAt).getTime();
  return Number.isFinite(c) && Number.isFinite(u) && u - c > EDIT_GRACE_MS;
}

/** Total pages for a count, never zero (an empty list is still page 1 of 1). */
export function pageCount(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}

/** Clamp a user-supplied ?page= to something sane. */
export function clampPage(raw: string | number | null | undefined, totalPages: number): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? '1'), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), Math.max(1, totalPages));
}
