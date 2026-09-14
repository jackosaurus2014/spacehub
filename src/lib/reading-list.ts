/**
 * Reading list — browser-first, account-second (competitor review 2026-09-10,
 * Tier 2 #10: "Reading list on the news feed").
 *
 * Same shape as saved jobs (src/lib/saved-jobs.ts): a signed-out visitor can
 * save anything and it lands in localStorage immediately, with no account, no
 * modal and no round-trip. If they are signed in, the same click ALSO posts to
 * /api/reading-list so the item follows them to another device. If they sign in
 * later, syncLocalToAccount() offers to push what the browser already holds.
 *
 * Before this file there were two disconnected stores: a 'spacenexus-bookmarks'
 * localStorage key written by the news-card bookmark button, and the
 * account-only DynamicContent list rendered at /reading-list. Saving on a card
 * put the article somewhere the reading-list page never looked. migrateLegacy()
 * folds the old key in once, then removes it.
 *
 * CLIENT-SAFE: no prisma, no server imports. Every function is a no-op on the
 * server (typeof window check) so it can be imported from shared components.
 */

export const READING_LIST_KEY = 'spacenexus_reading_list';
export const LEGACY_BOOKMARKS_KEY = 'spacenexus-bookmarks';
export const READING_LIST_EVENT = 'spacenexus:reading-list';
/** Matches the server-side cap in /api/reading-list. */
export const READING_LIST_MAX = 100;

export interface ReadingListItem {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  /** ISO timestamp. */
  savedAt: string;
  read: boolean;
  /** Present on locally-held items only; true once posted to the account. */
  synced?: boolean;
}

export type ReadingListInput = Pick<ReadingListItem, 'title' | 'url'> &
  Partial<Pick<ReadingListItem, 'source' | 'category'>>;

// ── Pure helpers (unit-tested without a browser) ──────────────────────────

/**
 * Identity for an article across stores. Case-insensitive host, no trailing
 * slash, no tracking params — the same story saved from a card and from the
 * digest email must collapse to one row.
 */
export function normalizeUrl(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    u.hash = '';
    for (const p of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_cid|mc_eid|ref$|source$)/i.test(p)) u.searchParams.delete(p);
    }
    const path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, '') : u.pathname;
    return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`;
  } catch {
    return s.replace(/[?#].*$/, '').replace(/\/+$/, '');
  }
}

/** Stable local id derived from the URL, so re-saving never duplicates. */
export function itemIdFor(url: string): string {
  const norm = normalizeUrl(url);
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash * 31 + norm.charCodeAt(i)) | 0;
  }
  return `rl_${(hash >>> 0).toString(36)}`;
}

export function makeItem(input: ReadingListInput, now: Date = new Date()): ReadingListItem {
  return {
    id: itemIdFor(input.url),
    title: input.title,
    url: input.url,
    source: input.source ?? '',
    category: input.category ?? '',
    savedAt: now.toISOString(),
    read: false,
    synced: false,
  };
}

/**
 * Merge the browser list with the account list for display.
 *
 * Account rows win on read-state (that is the authoritative copy), local rows
 * win on nothing but their own existence. Result is deduped on normalised URL
 * and sorted newest-saved first.
 */
export function mergeReadingLists(
  local: ReadingListItem[],
  account: ReadingListItem[],
): ReadingListItem[] {
  const byUrl = new Map<string, ReadingListItem>();
  for (const item of local) {
    if (!item?.url) continue;
    byUrl.set(normalizeUrl(item.url), { ...item });
  }
  for (const item of account) {
    if (!item?.url) continue;
    const key = normalizeUrl(item.url);
    const existing = byUrl.get(key);
    byUrl.set(key, existing ? { ...existing, ...item, synced: true } : { ...item, synced: true });
  }
  return [...byUrl.values()].sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0));
}

/** Items held only in this browser — what a sign-in nudge should offer to keep. */
export function unsyncedItems(items: ReadingListItem[]): ReadingListItem[] {
  return items.filter((i) => !i.synced);
}

// ── Browser store ─────────────────────────────────────────────────────────

interface LegacyBookmark {
  id: string;
  title: string;
  url: string;
  timestamp: number;
}

/** Fold the pre-2026-09-13 'spacenexus-bookmarks' key in, once. */
export function migrateLegacy(): ReadingListItem[] {
  if (typeof window === 'undefined') return [];
  let migrated: ReadingListItem[] = [];
  try {
    const raw = localStorage.getItem(LEGACY_BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyBookmark[];
    if (Array.isArray(parsed)) {
      migrated = parsed
        .filter((b) => b && typeof b.url === 'string' && b.url)
        .map((b) => ({
          id: itemIdFor(b.url),
          title: b.title || b.url,
          url: b.url,
          source: '',
          category: '',
          savedAt: new Date(b.timestamp || Date.now()).toISOString(),
          read: false,
          synced: false,
        }));
    }
    localStorage.removeItem(LEGACY_BOOKMARKS_KEY);
  } catch {
    /* storage unavailable or corrupt — drop the legacy key silently */
  }
  return migrated;
}

function rawRead(): ReadingListItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(READING_LIST_KEY);
    const list = raw ? (JSON.parse(raw) as ReadingListItem[]) : [];
    return Array.isArray(list) ? list.filter((i) => i && typeof i.url === 'string' && i.url) : [];
  } catch {
    return [];
  }
}

export function readLocalReadingList(): ReadingListItem[] {
  if (typeof window === 'undefined') return [];
  const current = rawRead();
  const legacy = migrateLegacy();
  if (legacy.length === 0) return current;
  const merged = mergeReadingLists(legacy, current);
  writeLocalReadingList(merged);
  return merged;
}

export function writeLocalReadingList(items: ReadingListItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(READING_LIST_KEY, JSON.stringify(items.slice(0, READING_LIST_MAX)));
    window.dispatchEvent(new CustomEvent(READING_LIST_EVENT));
  } catch {
    /* storage full or blocked — the save is simply not persisted */
  }
}

export function isSaved(url: string): boolean {
  const key = normalizeUrl(url);
  return readLocalReadingList().some((i) => normalizeUrl(i.url) === key);
}

export function removeLocalByUrl(url: string): void {
  const key = normalizeUrl(url);
  writeLocalReadingList(readLocalReadingList().filter((i) => normalizeUrl(i.url) !== key));
}

// ── Account mirror ────────────────────────────────────────────────────────

/**
 * Set once a POST comes back 401, so a signed-out visitor makes exactly one
 * pointless request per page load rather than one per save. Deliberately not
 * a useSession() read: the button must work in trees without a SessionProvider.
 */
let accountUnavailable = false;

/** Test seam. */
export function resetAccountAvailability(): void {
  accountUnavailable = false;
}

/** Push one item to the account. Resolves false when not signed in. */
export async function saveToAccount(item: ReadingListInput): Promise<boolean> {
  if (typeof window === 'undefined' || accountUnavailable) return false;
  try {
    const res = await fetch('/api/reading-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.title,
        url: item.url,
        source: item.source ?? '',
        category: item.category ?? '',
      }),
    });
    if (res.status === 401) {
      accountUnavailable = true;
      return false;
    }
    return res.ok;
  } catch {
    return false;
  }
}

/** Fetch the account list. Returns [] when signed out or unreachable. */
export async function fetchAccountReadingList(): Promise<ReadingListItem[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch('/api/reading-list');
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: ReadingListItem[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

/**
 * Save (or unsave) an article.
 *
 * Signed out: localStorage only, instantly. Signed in: localStorage AND the
 * account. The localStorage write happens first either way, so the button
 * never waits on the network and never loses a save if the request fails.
 * Returns the new saved state.
 */
export function toggleSaved(input: ReadingListInput): boolean {
  const list = readLocalReadingList();
  const key = normalizeUrl(input.url);
  const idx = list.findIndex((i) => normalizeUrl(i.url) === key);

  if (idx >= 0) {
    list.splice(idx, 1);
    writeLocalReadingList(list);
    // Account rows are removed by id from /reading-list itself; unsaving in
    // the feed only clears the browser copy, which is the copy the feed reads.
    return false;
  }

  const item = makeItem(input);
  writeLocalReadingList([item, ...list]);
  void saveToAccount(input).then((ok) => {
    if (!ok) return;
    const after = readLocalReadingList().map((i) =>
      normalizeUrl(i.url) === key ? { ...i, synced: true } : i,
    );
    writeLocalReadingList(after);
  });
  return true;
}

/**
 * Offer everything held only in this browser to the signed-in account.
 * Returns how many were accepted. Safe to call repeatedly.
 */
export async function syncLocalToAccount(): Promise<number> {
  const local = readLocalReadingList();
  const pending = unsyncedItems(local);
  if (pending.length === 0) return 0;
  let accepted = 0;
  for (const item of pending) {
    // Sequential on purpose: a 401 on the first request short-circuits the
    // rest through accountUnavailable instead of firing 100 doomed posts.
    // eslint-disable-next-line no-await-in-loop
    const ok = await saveToAccount(item);
    if (!ok) break;
    accepted++;
  }
  if (accepted > 0) {
    const syncedUrls = new Set(pending.slice(0, accepted).map((i) => normalizeUrl(i.url)));
    writeLocalReadingList(
      readLocalReadingList().map((i) =>
        syncedUrls.has(normalizeUrl(i.url)) ? { ...i, synced: true } : i,
      ),
    );
  }
  return accepted;
}

/**
 * The URL that saves an article from outside the app — used by the digest
 * emails, where there is no JavaScript to run. /reading-list/save does the
 * localStorage write (and the account POST when signed in) on arrival.
 */
export function saveLinkFor(item: ReadingListInput, appUrl = ''): string {
  const params = new URLSearchParams({ url: item.url, title: item.title });
  if (item.source) params.set('source', item.source);
  if (item.category) params.set('category', item.category);
  return `${appUrl}/reading-list/save?${params.toString()}`;
}
