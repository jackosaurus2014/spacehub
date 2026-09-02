/**
 * @jest-environment node
 *
 * POST /api/csp-report — both wire formats, field minimisation, dedupe,
 * and the always-204 contract.
 */

import { NextRequest } from 'next/server';

const warn = jest.fn();
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: (...a: unknown[]) => warn(...a), error: jest.fn() },
}));

import { POST } from '@/app/api/csp-report/route';
import {
  recentViolations,
  blockedUriToOrigin,
  documentUriToPath,
  uaFamily,
  summarizeReport,
  extractReportBodies,
} from '@/lib/csp-report';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function post(body: unknown, contentType = 'application/csp-report', ua = CHROME_UA, raw?: string) {
  return POST(
    new NextRequest('https://spacenexus.us/api/csp-report', {
      method: 'POST',
      headers: { 'content-type': contentType, 'user-agent': ua },
      body: raw ?? JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  warn.mockClear();
  recentViolations.clear();
});

describe('field minimisation helpers', () => {
  it('blockedUriToOrigin keeps origin only, or the CSP keyword', () => {
    expect(blockedUriToOrigin('https://evil.example.com/x.js?token=abc#f')).toBe('https://evil.example.com');
    expect(blockedUriToOrigin('inline')).toBe('inline');
    expect(blockedUriToOrigin('eval')).toBe('eval');
    expect(blockedUriToOrigin('data:text/javascript,alert(1)')).toBe('data:');
    expect(blockedUriToOrigin('blob:https://spacenexus.us/uuid')).toBe('blob:');
    expect(blockedUriToOrigin(undefined)).toBe('unknown');
    expect(blockedUriToOrigin('not a url /with/path')).toBe('unparseable');
  });

  it('documentUriToPath drops query + fragment', () => {
    expect(documentUriToPath('https://spacenexus.us/news?token=secret#x')).toBe('/news');
    expect(documentUriToPath('/launch/abc?x=1')).toBe('/launch/abc');
    expect(documentUriToPath(undefined)).toBe('unknown');
  });

  it('uaFamily is coarse', () => {
    expect(uaFamily(CHROME_UA)).toBe('chrome');
    expect(uaFamily('Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15')).toBe('safari');
    expect(uaFamily('Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/129.0')).toBe('firefox');
    expect(uaFamily('Mozilla/5.0 (Windows) Chrome/128 Safari/537.36 Edg/128.0')).toBe('edge');
    expect(uaFamily('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605 Version/17.0 Mobile/15E148 Safari/604.1')).toBe('safari-mobile');
    expect(uaFamily('Googlebot/2.1')).toBe('bot');
    expect(uaFamily(null)).toBe('unknown');
  });

  it('summarizeReport keeps the allow-listed fields and nothing else', () => {
    const s = summarizeReport(
      {
        'document-uri': 'https://spacenexus.us/desk?sid=123',
        'violated-directive': 'script-src-elem',
        'effective-directive': 'script-src-elem',
        'blocked-uri': 'https://cdn.example.net/tag.js',
        'script-sample': 'alert(document.cookie)',
        'source-file': 'chrome-extension://abc/inject.js',
        'line-number': 12,
        'column-number': 4,
        referrer: 'https://google.com',
        disposition: 'report',
      },
      CHROME_UA,
    );
    expect(s).toEqual({
      directive: 'script-src-elem',
      blockedOrigin: 'https://cdn.example.net',
      documentPath: '/desk',
      disposition: 'report',
      uaFamily: 'chrome',
    });
    expect(JSON.stringify(s)).not.toContain('cookie');
    expect(JSON.stringify(s)).not.toContain('chrome-extension');
  });

  it('summarizeReport handles the Reporting-API camelCase shape', () => {
    const s = summarizeReport(
      { documentURL: 'https://spacenexus.us/news', effectiveDirective: 'connect-src', blockedURL: 'https://x.y/z', disposition: 'enforce' },
      CHROME_UA,
    );
    expect(s?.directive).toBe('connect-src');
    expect(s?.blockedOrigin).toBe('https://x.y');
    expect(s?.disposition).toBe('enforce');
  });

  it('summarizeReport returns null without a directive', () => {
    expect(summarizeReport({ 'blocked-uri': 'https://a.b' }, CHROME_UA)).toBeNull();
  });

  it('extractReportBodies unwraps both shapes and ignores non-CSP report types', () => {
    expect(extractReportBodies({ 'csp-report': { a: 1 } })).toEqual([{ a: 1 }]);
    expect(extractReportBodies([{ type: 'csp-violation', body: { a: 1 } }, { type: 'deprecation', body: { b: 2 } }])).toEqual([{ a: 1 }]);
    expect(extractReportBodies('nope')).toEqual([]);
    expect(extractReportBodies(null)).toEqual([]);
  });
});

describe('POST /api/csp-report', () => {
  it('logs a report-uri style report once with tag csp_violation and returns 204 no-store', async () => {
    const res = await post({
      'csp-report': {
        'document-uri': 'https://spacenexus.us/news?utm=1',
        'effective-directive': 'script-src',
        'blocked-uri': 'https://bad.example.com/a.js',
        'script-sample': 'window.x=1',
        disposition: 'report',
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(warn).toHaveBeenCalledTimes(1);
    const [msg, ctx] = warn.mock.calls[0] as [string, Record<string, unknown>];
    expect(msg).toBe('csp_violation');
    expect(ctx).toEqual({
      tag: 'csp_violation',
      directive: 'script-src',
      blockedOrigin: 'https://bad.example.com',
      documentPath: '/news',
      disposition: 'report',
      uaFamily: 'chrome',
    });
    expect(ctx).not.toHaveProperty('script-sample');
  });

  it('accepts application/reports+json arrays', async () => {
    const res = await post(
      [
        { type: 'csp-violation', url: 'https://spacenexus.us/desk', body: { effectiveDirective: 'img-src', blockedURL: 'https://img.example.org/p.png', documentURL: 'https://spacenexus.us/desk', disposition: 'enforce' } },
        { type: 'csp-violation', url: 'https://spacenexus.us/desk', body: { effectiveDirective: 'frame-src', blockedURL: 'https://frames.example.org/', documentURL: 'https://spacenexus.us/desk', disposition: 'enforce' } },
      ],
      'application/reports+json',
    );
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls.map((c) => (c[1] as { directive: string }).directive).sort()).toEqual(['frame-src', 'img-src']);
  });

  it('dedupes directive|blockedOrigin within 60s, then logs again', async () => {
    const report = { 'csp-report': { 'effective-directive': 'connect-src', 'blocked-uri': 'https://dup.example.com/1', 'document-uri': 'https://spacenexus.us/a' } };
    await post(report);
    await post({ 'csp-report': { ...report['csp-report'], 'blocked-uri': 'https://dup.example.com/2', 'document-uri': 'https://spacenexus.us/b' } });
    expect(warn).toHaveBeenCalledTimes(1);

    const spy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
    try {
      await post(report);
    } finally {
      spy.mockRestore();
    }
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('returns 204 for garbage, empty, non-object and oversized bodies without logging', async () => {
    expect((await post(null, 'application/csp-report', CHROME_UA, '{not json')).status).toBe(204);
    expect((await post(null, 'application/csp-report', CHROME_UA, '')).status).toBe(204);
    expect((await post('just a string')).status).toBe(204);
    expect((await post(null, 'application/csp-report', CHROME_UA, 'x'.repeat(70 * 1024))).status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });

  it('never echoes the report back', async () => {
    const res = await post({ 'csp-report': { 'effective-directive': 'script-src', 'blocked-uri': 'inline' } });
    expect(await res.text()).toBe('');
  });
});
