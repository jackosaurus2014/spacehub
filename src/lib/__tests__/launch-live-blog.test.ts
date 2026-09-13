import {
  parseLiveEntry,
  sanitizeText,
  safeUrl,
  serializeEntries,
  MAX_BODY_LENGTH,
} from '@/lib/launch-live-blog';

describe('sanitizeText', () => {
  it('strips tags and collapses whitespace', () => {
    expect(sanitizeText('  <b>Go</b>   for\n launch ', 100)).toBe('Go for launch');
  });

  it('truncates to the cap', () => {
    expect(sanitizeText('x'.repeat(1000), MAX_BODY_LENGTH)).toHaveLength(MAX_BODY_LENGTH);
  });
});

describe('safeUrl', () => {
  it('keeps http(s) URLs', () => {
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a');
  });

  it('drops everything else', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('/relative')).toBeNull();
    expect(safeUrl('')).toBeNull();
    expect(safeUrl(42)).toBeNull();
  });
});

describe('parseLiveEntry', () => {
  it('requires a body', () => {
    expect(parseLiveEntry({ body: '   ' })).toEqual({ ok: false, error: 'body is required' });
    expect(parseLiveEntry(null).ok).toBe(false);
  });

  it('defaults an unknown kind to update', () => {
    const r = parseLiveEntry({ body: 'hi', kind: 'explosion' });
    expect(r.ok && r.value.kind).toBe('update');
  });

  it('keeps a known kind', () => {
    const r = parseLiveEntry({ body: 'hi', kind: 'Milestone' });
    expect(r.ok && r.value.kind).toBe('milestone');
  });

  it('gives a link a default label and drops a label with no link', () => {
    const withLink = parseLiveEntry({ body: 'hi', linkUrl: 'https://x.test/a' });
    expect(withLink.ok && withLink.value.linkLabel).toBe('Read more');
    const noLink = parseLiveEntry({ body: 'hi', linkLabel: 'See this' });
    expect(noLink.ok && noLink.value.linkLabel).toBeNull();
  });

  it('refuses a javascript: image', () => {
    const r = parseLiveEntry({ body: 'hi', imageUrl: 'javascript:alert(1)' });
    expect(r.ok && r.value.imageUrl).toBeNull();
  });
});

describe('serializeEntries', () => {
  it('orders newest first regardless of input order', () => {
    const out = serializeEntries([
      { id: 'a', body: 'a', linkUrl: null, linkLabel: null, imageUrl: null, kind: 'update', createdAt: new Date('2026-09-14T17:00:00Z') },
      { id: 'c', body: 'c', linkUrl: null, linkLabel: null, imageUrl: null, kind: 'update', createdAt: new Date('2026-09-14T18:00:00Z') },
      { id: 'b', body: 'b', linkUrl: null, linkLabel: null, imageUrl: null, kind: 'update', createdAt: new Date('2026-09-14T17:30:00Z') },
    ]);
    expect(out.map((e) => e.id)).toEqual(['c', 'b', 'a']);
    expect(out[0].at).toBe('2026-09-14T18:00:00.000Z');
  });

  it('does not mutate its input', () => {
    const rows = [
      { id: 'a', body: 'a', linkUrl: null, linkLabel: null, imageUrl: null, kind: 'update', createdAt: new Date('2026-09-14T17:00:00Z') },
      { id: 'b', body: 'b', linkUrl: null, linkLabel: null, imageUrl: null, kind: 'update', createdAt: new Date('2026-09-14T18:00:00Z') },
    ];
    serializeEntries(rows);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
  });
});
