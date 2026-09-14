/**
 * @jest-environment node
 */
/**
 * Forum SEO policy.
 *
 * The site's search traffic rests on dated, fact-checked editorial. Reviving
 * a forum on the same domain puts that at risk unless user-generated content
 * is held to a gate, so these pin the gate: what may be indexed, what the
 * sitemap may advertise, how paginated threads canonicalise, and that every
 * user link stays nofollow.
 */

import {
  threadIsIndexable,
  threadRobots,
  threadCanonical,
  categoryCanonical,
  threadDescription,
  stripMarkdown,
  truncateOnWord,
  pageCount,
  clampPage,
  wasEdited,
  UGC_LINK_REL,
  MIN_INDEXABLE_REPLIES,
  MIN_INDEXABLE_CONTENT_CHARS,
  EDIT_GRACE_MS,
} from '../forum-seo';

const BASE = 'https://spacenexus.us';

describe('threadIsIndexable', () => {
  it('refuses a thread with too few replies', () => {
    expect(
      threadIsIndexable({ postCount: MIN_INDEXABLE_REPLIES - 1, contentLength: 5000 })
    ).toBe(false);
  });

  it('refuses an anchored thread with no replies — that is a stub', () => {
    expect(threadIsIndexable({ postCount: 0, contentLength: 5000, isAnchored: true })).toBe(false);
  });

  it('indexes an anchored thread once a real discussion exists', () => {
    expect(
      threadIsIndexable({ postCount: MIN_INDEXABLE_REPLIES, contentLength: 10, isAnchored: true })
    ).toBe(true);
  });

  it('refuses a thin member thread even with replies', () => {
    expect(
      threadIsIndexable({
        postCount: MIN_INDEXABLE_REPLIES,
        contentLength: MIN_INDEXABLE_CONTENT_CHARS - 1,
      })
    ).toBe(false);
  });

  it('indexes a substantial member thread with replies', () => {
    expect(
      threadIsIndexable({
        postCount: MIN_INDEXABLE_REPLIES,
        contentLength: MIN_INDEXABLE_CONTENT_CHARS,
      })
    ).toBe(true);
  });
});

describe('threadRobots', () => {
  it('is noindex,follow for a stub — crawlers pass through to the subject', () => {
    expect(threadRobots({ postCount: 0, contentLength: 20 })).toEqual({
      robots: { index: false, follow: true },
    });
  });

  it('spreads nothing for an indexable thread, so the site default applies', () => {
    expect(threadRobots({ postCount: 5, contentLength: 5000 })).toEqual({});
  });
});

describe('canonicals', () => {
  it('canonicalises page 1 to the bare path — one page, one address', () => {
    expect(threadCanonical(BASE, 'launch-tech', 't1', 1)).toBe(
      `${BASE}/community/forums/launch-tech/t1`
    );
    expect(categoryCanonical(BASE, 'launch-tech', 1)).toBe(`${BASE}/community/forums/launch-tech`);
  });

  it('canonicalises later pages to THEMSELVES, never to page 1', () => {
    // Pointing page 3 at page 1 would tell Google the replies on page 3 do
    // not exist.
    expect(threadCanonical(BASE, 'launch-tech', 't1', 3)).toBe(
      `${BASE}/community/forums/launch-tech/t1?page=3`
    );
    expect(categoryCanonical(BASE, 'general', 2)).toBe(
      `${BASE}/community/forums/general?page=2`
    );
  });
});

describe('threadDescription', () => {
  it('prefers our own anchor subtitle over whatever a member typed', () => {
    const d = threadDescription({
      title: 'Launch discussion: Starship Flight 12',
      content: 'lol same',
      categoryName: 'Launch Technology',
      anchorSubtitle: 'Mission: Starlink rideshare to LEO.',
      postCount: 3,
    });
    expect(d).toContain('Mission: Starlink rideshare to LEO.');
    expect(d).toContain('3 replies');
    expect(d).not.toContain('lol same');
  });

  it('says so honestly when an anchored thread has no replies', () => {
    const d = threadDescription({
      title: 'x',
      content: 'y',
      categoryName: 'Launch Technology',
      anchorSubtitle: 'A flight.',
      postCount: 0,
    });
    expect(d).toContain('No replies yet.');
  });

  it('falls back to the opening post for a member thread', () => {
    const content = 'I have been comparing pad turnaround across three providers and the numbers surprised me.';
    const d = threadDescription({
      title: 'Pad turnaround',
      content,
      categoryName: 'Launch Technology',
      postCount: 4,
    });
    expect(d).toContain('comparing pad turnaround');
  });

  it('falls back to a generated line when the post is too short to describe anything', () => {
    const d = threadDescription({
      title: 'Question',
      content: 'hi',
      categoryName: 'General Discussion',
      postCount: 2,
    });
    expect(d).toContain('General Discussion');
  });

  it('never exceeds 160 characters', () => {
    const d = threadDescription({
      title: 'x',
      content: 'word '.repeat(200),
      categoryName: 'General Discussion',
      postCount: 2,
    });
    expect(d.length).toBeLessThanOrEqual(160);
  });
});

describe('stripMarkdown', () => {
  it('flattens markdown to prose and drops bare URLs', () => {
    const out = stripMarkdown('## Head\n\n**bold** [text](https://x.example.com) and https://y.example.com');
    expect(out).toContain('bold');
    expect(out).toContain('text');
    expect(out).not.toContain('http');
    expect(out).not.toContain('**');
    expect(out).not.toContain('##');
  });

  it('drops fenced code blocks', () => {
    expect(stripMarkdown('before\n```\ncode here\n```\nafter')).not.toContain('code here');
  });
});

describe('truncateOnWord', () => {
  it('cuts on a word boundary, not mid-word', () => {
    const out = truncateOnWord('alpha bravo charlie delta echo', 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out).toMatch(/…$/);
    expect(out).not.toMatch(/char…$/);
  });

  it('leaves a short string alone', () => {
    expect(truncateOnWord('short', 50)).toBe('short');
  });
});

describe('pagination helpers', () => {
  it('an empty list is still page 1 of 1', () => {
    expect(pageCount(0, 20)).toBe(1);
  });

  it('counts pages', () => {
    expect(pageCount(20, 20)).toBe(1);
    expect(pageCount(21, 20)).toBe(2);
  });

  it('clamps a hostile ?page= to the real range', () => {
    expect(clampPage('999', 3)).toBe(3);
    expect(clampPage('-1', 3)).toBe(1);
    expect(clampPage('abc', 3)).toBe(1);
    expect(clampPage(null, 3)).toBe(1);
    expect(clampPage('2', 3)).toBe(2);
  });
});

describe('wasEdited', () => {
  it('ignores the bump a new reply writes to updatedAt', () => {
    const t = new Date('2026-09-14T12:00:00Z');
    expect(wasEdited(t, new Date(t.getTime() + 1000))).toBe(false);
  });

  it('discloses a real edit', () => {
    const t = new Date('2026-09-14T12:00:00Z');
    expect(wasEdited(t, new Date(t.getTime() + EDIT_GRACE_MS + 1000))).toBe(true);
  });
});

describe('UGC_LINK_REL', () => {
  it('is nofollow and ugc — the reason not to spam the forum for backlinks', () => {
    expect(UGC_LINK_REL).toContain('nofollow');
    expect(UGC_LINK_REL).toContain('ugc');
    expect(UGC_LINK_REL).toContain('noopener');
  });
});
