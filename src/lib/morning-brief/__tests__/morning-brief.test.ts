/**
 * @jest-environment node
 *
 * SpaceNexus AM — pure-function tests: story ranking/selection, quality
 * gates (one case per failure mode), internal-link validation, subject
 * length, and the draft merge (the model can only touch prose). No DB, no
 * Anthropic call: everything here is a pure import.
 */
import { rankStories, storyWindowHours, isWeekdayUtc, scoreArticle, titleKey, type PoolArticle } from '@/lib/morning-brief/select';
import { runGates } from '@/lib/morning-brief/gates';
import { normalizeInternalHref, validateInternalHref, isHttpUrl } from '@/lib/morning-brief/routes';
import { subjectFor, renderMorningBriefEmail, fmtNet } from '@/lib/morning-brief/render';
import { mergeDraft, buildDraftPrompt } from '@/lib/morning-brief/draft';
import type { MorningBriefIssue } from '@/lib/morning-brief/types';

const NOW = new Date('2026-09-15T12:00:00Z'); // a Tuesday

function article(over: Partial<PoolArticle> & { id: string }): PoolArticle {
  return {
    title: `Story ${over.id}`,
    summary: 'summary',
    url: `https://example.com/${over.id}`,
    source: 'SpaceNews',
    category: 'launches',
    publishedAt: new Date(NOW.getTime() - 2 * 3_600_000),
    ...over,
  };
}

describe('window and weekday rules', () => {
  it('uses 36h on Monday and 24h otherwise', () => {
    expect(storyWindowHours(new Date('2026-09-14T12:00:00Z'))).toBe(36); // Monday
    expect(storyWindowHours(NOW)).toBe(24);
  });
  it('knows weekdays', () => {
    expect(isWeekdayUtc(new Date('2026-09-12T12:00:00Z'))).toBe(false); // Saturday
    expect(isWeekdayUtc(new Date('2026-09-13T12:00:00Z'))).toBe(false); // Sunday
    expect(isWeekdayUtc(NOW)).toBe(true);
  });
});

describe('rankStories', () => {
  it('drops articles outside the window', () => {
    const pool = [
      article({ id: 'fresh' }),
      article({ id: 'stale', publishedAt: new Date(NOW.getTime() - 30 * 3_600_000) }),
    ];
    const picked = rankStories(pool, { now: NOW });
    expect(picked.map((a) => a.id)).toEqual(['fresh']);
  });

  it('caps at two stories per source', () => {
    const titles = [
      'Vulcan clears NSSL certification review',
      'Rocket Lab books Neutron customer for 2027',
      'ESA approves Ariane 6 upper-stage upgrade',
      'ISRO delays Gaganyaan uncrewed test to December',
    ];
    const pool = ['a', 'b', 'c', 'd'].map((id, i) => article({ id, title: titles[i], source: 'SpaceNews' }));
    pool.push(article({ id: 'e', title: 'Starlink debris re-entry tracked over Pacific', source: 'Ars Technica Space' }));
    const picked = rankStories(pool, { now: NOW });
    expect(picked.filter((a) => a.source === 'SpaceNews').length).toBe(2);
    expect(picked.some((a) => a.id === 'e')).toBe(true);
  });

  it('reserves a business/policy slot and a launch/mission slot when available', () => {
    const pool = [
      ...['l1', 'l2', 'l3', 'l4'].map((id, i) => article({ id, title: `Falcon nine flies Starlink batch ${i} ${id}`, category: 'launches', source: `Feed${i}` })),
      article({ id: 'biz', title: 'Rocket Lab raises debt for Neutron factory', category: 'earnings', source: 'Payload Space', publishedAt: new Date(NOW.getTime() - 20 * 3_600_000) }),
    ];
    const picked = rankStories(pool, { now: NOW });
    expect(picked.some((a) => a.category === 'earnings')).toBe(true);
    expect(picked.some((a) => a.category === 'launches')).toBe(true);
  });

  it('collapses near-duplicate headlines from two feeds, keeping the better source', () => {
    const pool = [
      article({ id: 'dup1', title: 'NASA selects Blue Origin for Artemis cargo lander', source: 'SpaceDaily' }),
      article({ id: 'dup2', title: 'NASA selects Blue Origin for Artemis cargo lander mission', source: 'SpaceNews' }),
      article({ id: 'other', title: 'ESA signs Ariane 6 batch order with Arianespace', source: 'European Spaceflight', category: 'companies' }),
    ];
    const picked = rankStories(pool, { now: NOW });
    expect(picked.map((a) => a.id)).toContain('dup2');
    expect(picked.map((a) => a.id)).not.toContain('dup1');
  });

  it('ranks the lead by source quality then recency, and never more than five', () => {
    const titles = [
      'Blue Origin stacks New Glenn for third flight', 'FCC opens proceeding on orbital debris fees', 'Firefly Alpha returns to pad after anomaly',
      'Senate panel marks up NASA authorization bill', 'Relativity retires Terran 1 tooling', 'Japan H3 lofts QZSS navigation satellite',
      'ULA books Kuiper batch on Atlas V', 'Pentagon budget adds resilient GPS line', 'Astra pivots to engine sales',
      'China Long March 12 debuts from Hainan', 'Rocket Lab Electron flies 60th mission', 'Commerce finalizes remote-sensing rule',
    ];
    const pool = titles.map((title, i) => article({ id: `s${i}`, title, source: i === 3 ? 'SpaceNews' : `Blog ${i}`, category: i % 2 ? 'launches' : 'policy' }));
    const picked = rankStories(pool, { now: NOW });
    expect(picked.length).toBe(5);
    expect(picked[0].id).toBe('s3');
  });

  it('rejects non-http URLs and returns an empty list for an empty pool', () => {
    expect(rankStories([], { now: NOW })).toEqual([]);
    expect(rankStories([article({ id: 'x', url: 'javascript:alert(1)' })], { now: NOW })).toEqual([]);
  });

  it('scores filler titles below real stories', () => {
    const real = article({ id: 'r', title: 'ULA sets Vulcan NSSL launch date' });
    const filler = article({ id: 'f', title: 'NASA Image of the Day: Crab Nebula' });
    expect(scoreArticle(real, NOW, 24)).toBeGreaterThan(scoreArticle(filler, NOW, 24));
    expect(titleKey('The Big Launch!')).toBe('launch');
  });
});

describe('internal link validation', () => {
  const allow = new Set(['/guide/space-industry', '/rockets/falcon-9', '/company-profiles/rocket-lab']);
  it('normalises trailing slashes, absolute site URLs, and query strings', () => {
    expect(normalizeInternalHref('/guide/space-industry/')).toBe('/guide/space-industry');
    expect(normalizeInternalHref('https://spacenexus.us/rockets/falcon-9?utm=x')).toBe('/rockets/falcon-9');
    expect(normalizeInternalHref('https://www.spacenexus.us/guide/space-industry#top')).toBe('/guide/space-industry');
  });
  it('rejects anything not on the allow-list or not site-relative', () => {
    expect(validateInternalHref('/guide/space-industry', allow)).toBe('/guide/space-industry');
    expect(validateInternalHref('/guide/invented-page', allow)).toBeNull();
    expect(validateInternalHref('https://evil.example/guide/space-industry', allow)).toBeNull();
    expect(validateInternalHref('//evil.example', allow)).toBeNull();
    expect(validateInternalHref(null, allow)).toBeNull();
    expect(validateInternalHref(42, allow)).toBeNull();
  });
  it('isHttpUrl accepts only http(s)', () => {
    expect(isHttpUrl('https://example.com/a')).toBe(true);
    expect(isHttpUrl('ftp://example.com')).toBe(false);
    expect(isHttpUrl('/relative')).toBe(false);
  });
});

function goodIssue(): MorningBriefIssue {
  const stories = ['a', 'b', 'c'].map((id) => ({
    headline: `Headline ${id}`,
    whyItMatters: `Why ${id} matters today.`,
    source: 'SpaceNews',
    url: `https://example.com/${id}`,
    category: 'launches',
    publishedAt: new Date(NOW.getTime() - 3_600_000).toISOString(),
    internalHref: null,
    internalLabel: null,
  }));
  return {
    date: '2026-09-15',
    subject: 'AM: Headline a',
    preheader: 'Why a matters today.',
    stories,
    nextLaunch: { id: 'ev1', name: 'Falcon 9 | Starlink', rocket: 'Falcon 9', mission: null, site: 'Cape Canaveral', agency: 'SpaceX', netUtc: '2026-09-15T18:00:00Z', precision: 'hour', href: '/launch/ev1' },
    oneNumber: { kind: 'jobs', label: 'Jobs board', value: '6,540 open roles', context: 'ctx', source: 'src', asOf: '2026-09-15', href: '/jobs', notInvestmentAdvice: false },
    model: 'claude-sonnet-5',
    windowHours: 24,
    generatedAt: NOW.toISOString(),
  };
}

const ctx = () => ({
  now: NOW,
  windowHours: 24,
  poolUrls: new Set(['https://example.com/a', 'https://example.com/b', 'https://example.com/c']),
  allowedRoutes: new Set(['/guide/space-industry']),
});

describe('runGates', () => {
  it('passes a clean issue', () => {
    expect(runGates(goodIssue(), ctx())).toEqual({ ok: true, failures: [] });
  });
  it('fails on a null issue (model output did not parse)', () => {
    const r = runGates(null, ctx());
    expect(r.ok).toBe(false);
    expect(r.failures[0]).toMatch(/did not parse/);
  });
  it('fails with fewer than three stories', () => {
    const issue = goodIssue();
    issue.stories = issue.stories.slice(0, 2);
    expect(runGates(issue, ctx()).failures).toContainEqual(expect.stringMatching(/only 2 qualifying stories/));
  });
  it('fails on an empty or over-long subject', () => {
    const issue = goodIssue();
    issue.subject = '';
    expect(runGates(issue, ctx()).failures).toContain('subject is empty');
    issue.subject = `AM: ${'x'.repeat(80)}`;
    expect(runGates(issue, ctx()).failures).toContainEqual(expect.stringMatching(/subject is 84 chars/));
  });
  it('fails when a story url is not from the pool or not http(s)', () => {
    const issue = goodIssue();
    issue.stories[0].url = 'https://example.com/not-in-pool';
    expect(runGates(issue, ctx()).failures).toContainEqual(expect.stringMatching(/story 1: url is not from the article pool/));
    issue.stories[0].url = 'mailto:x@y.z';
    expect(runGates(issue, ctx()).failures).toContainEqual(expect.stringMatching(/story 1: url is not http/));
  });
  it('fails when a story is older than the window', () => {
    const issue = goodIssue();
    issue.stories[1].publishedAt = new Date(NOW.getTime() - 25 * 3_600_000).toISOString();
    expect(runGates(issue, ctx()).failures).toContainEqual(expect.stringMatching(/story 2: older than the 24h window/));
  });
  it('fails when an internal href is not a known route', () => {
    const issue = goodIssue();
    issue.stories[2].internalHref = '/guide/made-up';
    expect(runGates(issue, ctx()).failures).toContainEqual(expect.stringMatching(/story 3: internal href \/guide\/made-up is not a known route/));
    issue.stories[2].internalHref = '/guide/space-industry/';
    expect(runGates(issue, ctx()).ok).toBe(true);
  });
  it('fails on over-long headline / why-it-matters', () => {
    const issue = goodIssue();
    issue.stories[0].headline = 'h'.repeat(91);
    issue.stories[0].whyItMatters = 'w'.repeat(161);
    const f = runGates(issue, ctx()).failures;
    expect(f).toContainEqual(expect.stringMatching(/headline 91 chars/));
    expect(f).toContainEqual(expect.stringMatching(/why-it-matters 161 chars/));
  });
  it('fails on a malformed next-launch block', () => {
    const issue = goodIssue();
    issue.nextLaunch = { ...issue.nextLaunch!, href: 'https://evil.example', netUtc: 'not a date' };
    const f = runGates(issue, ctx()).failures;
    expect(f).toContain('next launch href is not a /launch/<id> route');
    expect(f).toContain('next launch has no valid NET');
  });
});

describe('subject and render', () => {
  it('prefixes AM: and never exceeds 70 chars', () => {
    expect(subjectFor('Short one')).toBe('AM: Short one');
    const long = subjectFor('A'.repeat(200));
    expect(long.startsWith('AM: ')).toBe(true);
    expect(long.length).toBeLessThanOrEqual(70);
  });
  it('renders stories, next launch, one number, and the token-based footer links', () => {
    const r = renderMorningBriefEmail(goodIssue());
    expect(r.subject).toBe('AM: Headline a');
    expect(r.preheader).toBe('Why a matters today.');
    expect(r.html).toContain('Headline a');
    expect(r.html).toContain('https://example.com/a');
    expect(r.html).toContain('/launch/ev1');
    expect(r.html).toContain('6,540 open roles');
    expect(r.html).toContain('/api/newsletter/morning-brief?token={{UNSUBSCRIBE_TOKEN}}&action=disable');
    expect(r.html).toContain('/api/newsletter/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}');
    expect(r.html).toContain('/brief/am/2026-09-15');
    expect(r.plain).toContain('FIVE STORIES');
    expect(r.plain).toContain('NEXT LAUNCH');
    expect(r.html).not.toContain('Not investment advice');
  });
  it('adds the not-investment-advice line for a stock number', () => {
    const issue = goodIssue();
    issue.oneNumber = { ...issue.oneNumber!, kind: 'stock', notInvestmentAdvice: true };
    expect(renderMorningBriefEmail(issue).html).toContain('Not investment advice.');
  });
  it('formats NET in UTC and ET, and coarse precisions as NET month', () => {
    expect(fmtNet('2026-09-15T18:00:00Z', 'hour')).toBe('Tue, Sep 15 · 18:00 UTC (2:00 PM ET)');
    expect(fmtNet('2026-12-01T00:00:00Z', 'month')).toBe('NET December 2026');
  });
});

describe('mergeDraft', () => {
  const stories = [article({ id: 'a' }), article({ id: 'b', source: 'Payload Space' })];
  const routes = [{ href: '/guide/space-industry', label: 'Space industry guide', hint: 'guide' }];
  it('maps prose by index, keeps pool urls/sources, validates hrefs, drops unknown indexes', () => {
    const out = mergeDraft({ now: NOW, stories, routes }, [
      { index: 2, headline: ' Second  story ', whyItMatters: 'because', internalHref: '/guide/space-industry/' },
      { index: 1, headline: 'First', whyItMatters: 'why', internalHref: '/guide/invented' },
      { index: 9, headline: 'ghost', whyItMatters: 'ghost' },
    ]);
    expect(out.map((s) => s.url)).toEqual(['https://example.com/a', 'https://example.com/b']);
    expect(out[0]).toMatchObject({ headline: 'First', internalHref: null, source: 'SpaceNews' });
    expect(out[1]).toMatchObject({ headline: 'Second story', internalHref: '/guide/space-industry', internalLabel: 'Space industry guide', source: 'Payload Space' });
  });
  it('the prompt lists every story and every allowed route, and asks for JSON only', () => {
    const p = buildDraftPrompt({ now: NOW, stories, routes });
    expect(p).toContain('1. [launches] Story a');
    expect(p).toContain('2. [launches] Story b');
    expect(p).toContain('/guide/space-industry — Space industry guide');
    expect(p).toContain('Never invent a route');
    expect(p).toContain('valid JSON only');
  });
});
