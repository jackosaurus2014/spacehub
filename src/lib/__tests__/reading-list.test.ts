/**
 * Reading list — save from any card, signed out or signed in
 * (competitor review 2026-09-10, Tier 2 #10).
 *
 * Default jsdom environment: this module is browser-first by design, and the
 * behaviour worth guarding is exactly the localStorage path a signed-out
 * visitor takes.
 */

import {
  READING_LIST_KEY,
  LEGACY_BOOKMARKS_KEY,
  READING_LIST_EVENT,
  normalizeUrl,
  itemIdFor,
  makeItem,
  mergeReadingLists,
  unsyncedItems,
  migrateLegacy,
  readLocalReadingList,
  writeLocalReadingList,
  isSaved,
  removeLocalByUrl,
  toggleSaved,
  saveToAccount,
  syncLocalToAccount,
  resetAccountAvailability,
  saveLinkFor,
  type ReadingListItem,
} from '@/lib/reading-list';

const ARTICLE = {
  title: 'Starship flies again',
  url: 'https://example.com/starship?utm_source=twitter#top',
  source: 'Example News',
  category: 'launches',
};

function seed(items: ReadingListItem[]) {
  localStorage.setItem(READING_LIST_KEY, JSON.stringify(items));
}

beforeEach(() => {
  localStorage.clear();
  resetAccountAvailability();
  // Default: signed out. Individual tests override.
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }) as unknown as typeof fetch;
});

// ── Identity ─────────────────────────────────────────────────────────────

describe('normalizeUrl', () => {
  it('strips tracking params, the hash and a trailing slash', () => {
    expect(normalizeUrl('https://Example.com/a/?utm_source=x&utm_medium=y#frag')).toBe(
      'https://example.com/a',
    );
  });

  it('keeps meaningful query params', () => {
    expect(normalizeUrl('https://example.com/a?id=7')).toBe('https://example.com/a?id=7');
  });

  it('collapses the same story saved from a card and from an email to one key', () => {
    expect(normalizeUrl('https://example.com/story')).toBe(
      normalizeUrl('https://example.com/story/?utm_campaign=digest'),
    );
  });

  it('handles internal paths, which are not absolute URLs', () => {
    expect(normalizeUrl('/blog/my-post/')).toBe('/blog/my-post');
  });

  it('returns an empty string for empty input rather than throwing', () => {
    expect(normalizeUrl('')).toBe('');
  });
});

describe('itemIdFor', () => {
  it('is stable for the same article', () => {
    expect(itemIdFor(ARTICLE.url)).toBe(itemIdFor('https://example.com/starship'));
  });

  it('differs between articles', () => {
    expect(itemIdFor('https://example.com/a')).not.toBe(itemIdFor('https://example.com/b'));
  });
});

// ── Signed-out behaviour ─────────────────────────────────────────────────

describe('signed-out saving', () => {
  it('saves to localStorage with no account and no successful request', async () => {
    expect(toggleSaved(ARTICLE)).toBe(true);
    const stored = readLocalReadingList();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe(ARTICLE.title);
    expect(stored[0].source).toBe('Example News');
    expect(stored[0].synced).toBe(false);
  });

  it('reports the article as saved afterwards, ignoring tracking params', () => {
    toggleSaved(ARTICLE);
    expect(isSaved('https://example.com/starship')).toBe(true);
    expect(isSaved('https://example.com/starship/?utm_source=news')).toBe(true);
    expect(isSaved('https://example.com/other')).toBe(false);
  });

  it('toggles off on a second click', () => {
    toggleSaved(ARTICLE);
    expect(toggleSaved(ARTICLE)).toBe(false);
    expect(readLocalReadingList()).toHaveLength(0);
  });

  it('never duplicates the same article', () => {
    toggleSaved(ARTICLE);
    toggleSaved({ title: 'Same story, other headline', url: 'https://example.com/starship/' });
    // Second call toggled the existing row off rather than adding a twin.
    expect(readLocalReadingList()).toHaveLength(0);
  });

  it('notifies other components in the tab', () => {
    const listener = jest.fn();
    window.addEventListener(READING_LIST_EVENT, listener);
    toggleSaved(ARTICLE);
    expect(listener).toHaveBeenCalled();
    window.removeEventListener(READING_LIST_EVENT, listener);
  });

  it('stops asking the server once it has been told the visitor is signed out', async () => {
    await saveToAccount(ARTICLE);
    await saveToAccount(ARTICLE);
    await saveToAccount(ARTICLE);
    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  it('removes by url', () => {
    toggleSaved(ARTICLE);
    removeLocalByUrl('https://example.com/starship');
    expect(readLocalReadingList()).toHaveLength(0);
  });

  it('survives unreadable storage without throwing', () => {
    localStorage.setItem(READING_LIST_KEY, 'not json');
    expect(readLocalReadingList()).toEqual([]);
  });
});

// ── Signed-in behaviour ──────────────────────────────────────────────────

describe('signed-in saving', () => {
  beforeEach(() => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ message: 'Added' }) }) as unknown as typeof fetch;
  });

  it('writes the browser copy AND posts to the account', async () => {
    expect(toggleSaved(ARTICLE)).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/reading-list',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({
      title: ARTICLE.title,
      url: ARTICLE.url,
      source: ARTICLE.source,
      category: ARTICLE.category,
    });
  });

  it('keeps the local row even when the account call fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    toggleSaved(ARTICLE);
    await Promise.resolve();
    expect(readLocalReadingList()).toHaveLength(1);
  });

  it('syncLocalToAccount pushes everything the browser holds alone', async () => {
    seed([
      makeItem({ title: 'One', url: 'https://example.com/1' }),
      makeItem({ title: 'Two', url: 'https://example.com/2' }),
      { ...makeItem({ title: 'Three', url: 'https://example.com/3' }), synced: true },
    ]);
    const saved = await syncLocalToAccount();
    expect(saved).toBe(2);
    expect(unsyncedItems(readLocalReadingList())).toHaveLength(0);
  });

  it('syncLocalToAccount stops at the first rejection instead of hammering the API', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }) as unknown as typeof fetch;
    seed([
      makeItem({ title: 'One', url: 'https://example.com/1' }),
      makeItem({ title: 'Two', url: 'https://example.com/2' }),
      makeItem({ title: 'Three', url: 'https://example.com/3' }),
    ]);
    expect(await syncLocalToAccount()).toBe(0);
    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(1);
    // Nothing was falsely marked as kept.
    expect(unsyncedItems(readLocalReadingList())).toHaveLength(3);
  });

  it('syncLocalToAccount is a no-op when there is nothing pending', async () => {
    expect(await syncLocalToAccount()).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ── Merging the two stores ───────────────────────────────────────────────

describe('mergeReadingLists', () => {
  const local = makeItem({ title: 'Local only', url: 'https://example.com/local' }, new Date('2026-09-01'));
  const shared = makeItem({ title: 'Shared', url: 'https://example.com/shared' }, new Date('2026-09-02'));
  const account: ReadingListItem = {
    id: 'server-1',
    title: 'Shared',
    url: 'https://example.com/shared/',
    source: 'Example',
    category: 'launches',
    savedAt: '2026-09-03T00:00:00.000Z',
    read: true,
  };

  it('dedupes across stores on the normalised url', () => {
    const merged = mergeReadingLists([local, shared], [account]);
    expect(merged).toHaveLength(2);
  });

  it('lets the account row win on read state', () => {
    const merged = mergeReadingLists([shared], [account]);
    expect(merged[0].read).toBe(true);
    expect(merged[0].synced).toBe(true);
  });

  it('keeps browser-only rows and marks them unsynced', () => {
    const merged = mergeReadingLists([local], [account]);
    expect(unsyncedItems(merged).map((i) => i.title)).toEqual(['Local only']);
  });

  it('sorts newest-saved first', () => {
    const merged = mergeReadingLists([local, shared], [account]);
    expect(merged[0].title).toBe('Shared');
  });

  it('handles both sides being empty', () => {
    expect(mergeReadingLists([], [])).toEqual([]);
  });
});

// ── Legacy key ───────────────────────────────────────────────────────────

describe('migrateLegacy', () => {
  it('folds the old bookmark key in and removes it', () => {
    localStorage.setItem(
      LEGACY_BOOKMARKS_KEY,
      JSON.stringify([{ id: 'x', title: 'Old bookmark', url: 'https://example.com/old', timestamp: 1_700_000_000_000 }]),
    );
    const items = readLocalReadingList();
    expect(items.map((i) => i.title)).toContain('Old bookmark');
    expect(localStorage.getItem(LEGACY_BOOKMARKS_KEY)).toBeNull();
    // And it persisted, so the next read does not depend on the legacy key.
    expect(readLocalReadingList().map((i) => i.title)).toContain('Old bookmark');
  });

  it('returns nothing when there is no legacy key', () => {
    expect(migrateLegacy()).toEqual([]);
  });
});

// ── Email link ───────────────────────────────────────────────────────────

describe('saveLinkFor', () => {
  it('builds a /reading-list/save link carrying the article', () => {
    const href = saveLinkFor(ARTICLE, 'https://spacenexus.us');
    expect(href.startsWith('https://spacenexus.us/reading-list/save?')).toBe(true);
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('url')).toBe(ARTICLE.url);
    expect(params.get('title')).toBe(ARTICLE.title);
    expect(params.get('source')).toBe(ARTICLE.source);
  });

  it('omits empty optional fields', () => {
    const href = saveLinkFor({ title: 'T', url: 'https://example.com/x' });
    expect(href).not.toContain('source=');
    expect(href).not.toContain('category=');
  });
});

// ── Cap ──────────────────────────────────────────────────────────────────

describe('storage cap', () => {
  it('never stores more than the server-side maximum', () => {
    writeLocalReadingList(
      Array.from({ length: 150 }, (_, i) => makeItem({ title: `t${i}`, url: `https://example.com/${i}` })),
    );
    expect(readLocalReadingList()).toHaveLength(100);
  });
});
