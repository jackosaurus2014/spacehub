/**
 * @jest-environment node
 */
/**
 * Forum anti-abuse guard.
 *
 * A public posting surface is a link-spam farm within a week without this, so
 * the rules are pinned: what gets stripped before storage, what gets
 * rejected, and that the per-account throttle cannot be talked out of its
 * budget by retrying.
 */

import {
  sanitizeForumBody,
  sanitizeForumTitle,
  countLinks,
  extractHosts,
  inspectContent,
  isDuplicateBody,
  postingThrottle,
  __resetForumThrottle,
  __forumThrottleSize,
  FORUM_THROTTLES,
  NEW_ACCOUNT_AGE_MS,
} from '../forum-guard';

beforeEach(() => {
  __resetForumThrottle();
});

describe('sanitizeForumBody', () => {
  it('strips every HTML tag', () => {
    expect(sanitizeForumBody('<script>alert(1)</script>hello')).toBe('hello');
    expect(sanitizeForumBody('<b>bold</b> text')).toBe('bold text');
    expect(sanitizeForumBody('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('leaves markdown source intact — bodies are markdown, not HTML', () => {
    const md = '**bold** and [a link](https://example.com)\n\n- one\n- two';
    expect(sanitizeForumBody(md)).toBe(md);
  });

  it('collapses runs of blank lines used to push a link below the fold', () => {
    expect(sanitizeForumBody('top' + '\n'.repeat(40) + 'buy now')).toBe(
      'top\n\n\nbuy now'
    );
  });

  it('normalises CRLF and trims', () => {
    expect(sanitizeForumBody('  a\r\nb  ')).toBe('a\nb');
  });
});

describe('sanitizeForumTitle', () => {
  it('flattens a title to a single line with no markup', () => {
    expect(sanitizeForumTitle('<h1>Big</h1>\n  news  ')).toBe('Big news');
  });
});

describe('link counting', () => {
  it('counts links and extracts hosts without www', () => {
    const body = 'see https://www.example.com/a and http://other.org/b';
    expect(countLinks(body)).toBe(2);
    expect(extractHosts(body)).toEqual(['example.com', 'other.org']);
  });
});

describe('inspectContent', () => {
  const longEnough = 'This is a perfectly ordinary post about launch cadence and pad turnaround.';

  it('accepts an ordinary post', () => {
    expect(inspectContent(longEnough).ok).toBe(true);
  });

  it('rejects an empty post', () => {
    expect(inspectContent(' ').ok).toBe(false);
  });

  it('rejects link stuffing', () => {
    const body = `${longEnough} ` + Array.from({ length: 12 }, (_, i) => `https://s${i}.example.com/x`).join(' ');
    const v = inspectContent(body);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/links/i);
  });

  it('rejects a post that is mostly link', () => {
    const v = inspectContent('hi https://example.com/a/very/long/tracking/url/that/dominates/the/post');
    expect(v.ok).toBe(false);
  });

  it('allows several sources inside a substantial post', () => {
    const body = `${'Real analysis of the launch market. '.repeat(30)} https://a.example.com https://b.example.com`;
    expect(inspectContent(body).ok).toBe(true);
  });

  it('holds new accounts to one link for the first day', () => {
    const now = new Date('2026-09-14T12:00:00Z');
    const fresh = new Date(now.getTime() - 60 * 60 * 1000);
    const aged = new Date(now.getTime() - NEW_ACCOUNT_AGE_MS - 1000);
    // Long enough that the link-density rule is satisfied, so this case
    // isolates the account-age rule rather than tripping over its neighbour.
    const body = `${'Detailed notes on pad turnaround and range scheduling. '.repeat(8)} https://a.example.com https://b.example.com`;

    expect(inspectContent(body, { accountCreatedAt: fresh, now }).ok).toBe(false);
    expect(inspectContent(body, { accountCreatedAt: aged, now }).ok).toBe(true);
  });

  it('lets a new account post a single link', () => {
    const now = new Date('2026-09-14T12:00:00Z');
    const fresh = new Date(now.getTime() - 60 * 1000);
    expect(
      inspectContent(`${longEnough} https://a.example.com`, { accountCreatedAt: fresh, now }).ok
    ).toBe(true);
  });

  it('keeps links out of titles', () => {
    expect(inspectContent('Check https://spam.example.com now', { isTitle: true }).ok).toBe(false);
  });

  it('rejects the same host repeated as an advert', () => {
    const body = `${longEnough} https://shop.example.com/1 https://shop.example.com/2 https://shop.example.com/3 https://shop.example.com/4`;
    expect(inspectContent(body).ok).toBe(false);
  });

  it('rejects shouting but not short acronym posts', () => {
    expect(inspectContent('NASA ULA NSSL RFP').ok).toBe(true);
    expect(inspectContent('BUY CHEAP FOLLOWERS RIGHT NOW AT THE BEST PRICE EVER').ok).toBe(false);
  });

  it('rejects repeated filler', () => {
    expect(inspectContent(`${longEnough} ${'a'.repeat(50)}`).ok).toBe(false);
  });
});

describe('isDuplicateBody', () => {
  it('matches the same substantial body regardless of whitespace and case', () => {
    const a = 'This is a reasonably long post that someone submitted twice by accident.';
    expect(isDuplicateBody(a, `  ${a.toUpperCase()}  `)).toBe(true);
  });

  it('does not treat short agreement as a duplicate', () => {
    expect(isDuplicateBody('agreed', 'agreed')).toBe(false);
  });
});

describe('postingThrottle', () => {
  it('allows up to the budget then refuses', () => {
    const max = FORUM_THROTTLES.thread.max;
    for (let i = 0; i < max; i++) {
      expect(postingThrottle('u1', 'thread').allowed).toBe(true);
    }
    const blocked = postingThrottle('u1', 'thread');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('does not record a rejected attempt, so retrying never extends the wait', () => {
    const t0 = 1_000_000;
    const max = FORUM_THROTTLES.thread.max;
    for (let i = 0; i < max; i++) postingThrottle('u2', 'thread', t0);

    const first = postingThrottle('u2', 'thread', t0 + 1000);
    const second = postingThrottle('u2', 'thread', t0 + 2000);
    expect(first.allowed).toBe(false);
    expect(second.allowed).toBe(false);
    // Retry-after shrinks as the window slides; it never grows because the
    // caller kept knocking.
    expect(second.retryAfterMs).toBeLessThanOrEqual(first.retryAfterMs);
  });

  it('budgets each action separately', () => {
    for (let i = 0; i < FORUM_THROTTLES.thread.max; i++) postingThrottle('u3', 'thread');
    expect(postingThrottle('u3', 'thread').allowed).toBe(false);
    expect(postingThrottle('u3', 'reply').allowed).toBe(true);
  });

  it('budgets each account separately', () => {
    for (let i = 0; i < FORUM_THROTTLES.thread.max; i++) postingThrottle('u4', 'thread');
    expect(postingThrottle('u4', 'thread').allowed).toBe(false);
    expect(postingThrottle('u5', 'thread').allowed).toBe(true);
  });

  it('frees the budget once the window passes', () => {
    const t0 = 2_000_000;
    for (let i = 0; i < FORUM_THROTTLES.thread.max; i++) postingThrottle('u6', 'thread', t0);
    expect(postingThrottle('u6', 'thread', t0).allowed).toBe(false);
    expect(
      postingThrottle('u6', 'thread', t0 + FORUM_THROTTLES.thread.windowMs + 1).allowed
    ).toBe(true);
  });

  it('tracks keys', () => {
    postingThrottle('u7', 'reply');
    expect(__forumThrottleSize()).toBeGreaterThan(0);
  });
});
