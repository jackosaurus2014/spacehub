/**
 * @jest-environment node
 */

/**
 * SSRF guard tests — src/lib/security/safe-url.ts + safe-url-core.ts.
 *
 * Background: POST /api/podcasts stored an attacker-supplied feedUrl that the
 * podcasts-sync cron later fetched server-side with rss-parser's parseURL
 * (which follows redirects). These tests pin the guard that now sits in front
 * of that fetch: private-range detection, URL shape policy, DNS-answer
 * validation (rebinding), redirect re-validation, and the body-size cap.
 */

jest.mock('dns', () => ({
  promises: { lookup: jest.fn() },
}));

import * as dns from 'dns';
import {
  isPrivateAddress,
  assertPublicHttpUrl,
  assertPublicHttpUrlSync,
  safeFetchText,
} from '@/lib/security/safe-url';

const lookup = dns.promises.lookup as unknown as jest.Mock;

function resolveTo(...addresses: string[]) {
  lookup.mockResolvedValue(
    addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 })),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// isPrivateAddress
// ─────────────────────────────────────────────────────────────────────────────

describe('isPrivateAddress', () => {
  const privateV4: Array<[string, string]> = [
    ['0.0.0.0', '0/8 this-network'],
    ['0.1.2.3', '0/8 this-network'],
    ['10.0.0.1', '10/8'],
    ['10.255.255.255', '10/8'],
    ['127.0.0.1', '127/8 loopback'],
    ['127.255.0.9', '127/8 loopback'],
    ['169.254.169.254', '169.254/16 link-local (cloud metadata)'],
    ['169.254.0.1', '169.254/16'],
    ['172.16.0.1', '172.16/12'],
    ['172.31.255.254', '172.16/12'],
    ['192.168.1.1', '192.168/16'],
    ['100.64.0.1', '100.64/10 CGNAT'],
    ['100.127.255.255', '100.64/10 CGNAT'],
    ['224.0.0.1', '224/4 multicast'],
    ['239.255.255.255', '224/4 multicast'],
    ['240.0.0.1', '240/4 reserved'],
    ['255.255.255.255', 'broadcast'],
  ];

  it.each(privateV4)('IPv4 %s is private (%s)', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  const publicV4 = ['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '100.63.255.255', '100.128.0.0', '11.0.0.1', '192.169.0.1', '223.255.255.255'];
  it.each(publicV4)('IPv4 %s is public', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });

  const privateV6: Array<[string, string]> = [
    ['::', 'unspecified'],
    ['::1', 'loopback'],
    ['0:0:0:0:0:0:0:1', 'loopback (expanded)'],
    ['fc00::1', 'fc00::/7 ULA'],
    ['fd12:3456:789a::1', 'fc00::/7 ULA'],
    ['fe80::1', 'fe80::/10 link-local'],
    ['fe80::1%eth0', 'fe80::/10 link-local with zone'],
    ['febf::1', 'fe80::/10 link-local upper bound'],
    ['ff02::1', 'ff00::/8 multicast'],
    ['::ffff:127.0.0.1', 'v4-mapped loopback'],
    ['::ffff:169.254.169.254', 'v4-mapped metadata'],
    ['::ffff:10.0.0.5', 'v4-mapped 10/8'],
    ['::ffff:7f00:1', 'v4-mapped loopback (hex form)'],
    ['::ffff:a9fe:a9fe', 'v4-mapped metadata (hex form)'],
    ['64:ff9b::7f00:1', 'NAT64 loopback'],
    ['2002:7f00:1::', '6to4 loopback'],
  ];

  it.each(privateV6)('IPv6 %s is private (%s)', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  const publicV6 = ['2001:4860:4860::8888', '2606:4700::1111', '::ffff:8.8.8.8', 'fe00::1', 'fec::1'];
  it.each(publicV6)('IPv6 %s is public', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });

  it('treats unparseable input as private (fail closed)', () => {
    expect(isPrivateAddress('not-an-ip')).toBe(true);
    expect(isPrivateAddress('')).toBe(true);
    expect(isPrivateAddress('1.2.3')).toBe(true);
    expect(isPrivateAddress('1.2.3.256')).toBe(true);
    expect(isPrivateAddress('1:2:3')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// assertPublicHttpUrl
// ─────────────────────────────────────────────────────────────────────────────

describe('assertPublicHttpUrl', () => {
  beforeEach(() => {
    lookup.mockReset();
    resolveTo('93.184.216.34');
  });

  const rejected: Array<[string, RegExp]> = [
    ['http://localhost/feed.xml', /localhost/i],
    ['http://LOCALHOST./feed.xml', /localhost/i],
    ['http://127.0.0.1/feed.xml', /not publicly routable/i],
    ['http://127.0.0.1:3000/api/admin', /port 3000/i],
    ['http://169.254.169.254/latest/meta-data/', /not publicly routable/i],
    ['http://[::1]/feed.xml', /not publicly routable/i],
    ['http://[::ffff:127.0.0.1]/feed.xml', /not publicly routable/i],
    ['http://10.0.0.5/feed.xml', /not publicly routable/i],
    ['http://0.0.0.0/', /not publicly routable/i],
    // WHATWG URL normalises decimal / hex / short-form IPv4 to dotted quad
    ['http://2130706433/', /not publicly routable/i],
    ['http://0x7f.1/', /not publicly routable/i],
    ['http://user:pw@feeds.example.com/feed.xml', /credentials/i],
    ['http://user@feeds.example.com/feed.xml', /credentials/i],
    ['http://feeds.example.com:8080/feed.xml', /port 8080/i],
    ['ftp://feeds.example.com/feed.xml', /protocol/i],
    ['file:///etc/passwd', /protocol/i],
    ['javascript:alert(1)', /protocol|invalid/i],
    ['http://metadata.internal/computeMetadata/v1/', /not allowed/i],
    ['http://printer.local/', /not allowed/i],
    ['http://app.localhost/', /not allowed/i],
    ['not a url', /invalid url/i],
  ];

  it.each(rejected)('rejects %s', async (url, reason) => {
    await expect(assertPublicHttpUrl(url)).rejects.toThrow(reason);
  });

  it('does not touch DNS for rejected IP literals / shape failures', async () => {
    await expect(assertPublicHttpUrl('http://127.0.0.1/')).rejects.toThrow();
    await expect(assertPublicHttpUrl('http://feeds.example.com:8080/')).rejects.toThrow();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('accepts https://feeds.example.com when DNS resolves to a public IP', async () => {
    resolveTo('93.184.216.34');
    const url = await assertPublicHttpUrl('https://feeds.example.com/rss');
    expect(url).toBeInstanceOf(URL);
    expect(url.hostname).toBe('feeds.example.com');
    expect(lookup).toHaveBeenCalledWith('feeds.example.com', { all: true });
  });

  it('accepts explicit :443 / :80 ports', async () => {
    await expect(assertPublicHttpUrl('https://feeds.example.com:443/rss')).resolves.toBeInstanceOf(URL);
    await expect(assertPublicHttpUrl('http://feeds.example.com:80/rss')).resolves.toBeInstanceOf(URL);
  });

  it('accepts a public IP literal without a DNS lookup', async () => {
    await expect(assertPublicHttpUrl('http://93.184.216.34/rss')).resolves.toBeInstanceOf(URL);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('SECURITY: rejects a public-looking hostname that resolves to 10.0.0.5 (DNS rebinding)', async () => {
    resolveTo('10.0.0.5');
    await expect(assertPublicHttpUrl('https://feeds.example.com/rss')).rejects.toThrow(
      /resolves to a non-public address \(10\.0\.0\.5\)/,
    );
  });

  it('SECURITY: rejects when ANY answer is private (mixed A records)', async () => {
    resolveTo('93.184.216.34', '169.254.169.254');
    await expect(assertPublicHttpUrl('https://feeds.example.com/rss')).rejects.toThrow(/169\.254\.169\.254/);
  });

  it('SECURITY: rejects a private AAAA answer', async () => {
    resolveTo('93.184.216.34', '::1');
    await expect(assertPublicHttpUrl('https://feeds.example.com/rss')).rejects.toThrow(/::1/);
  });

  it('rejects when DNS fails or returns nothing', async () => {
    lookup.mockRejectedValue(Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }));
    await expect(assertPublicHttpUrl('https://nope.example.com/')).rejects.toThrow(/DNS lookup failed.*ENOTFOUND/);

    lookup.mockResolvedValue([]);
    await expect(assertPublicHttpUrl('https://empty.example.com/')).rejects.toThrow(/no addresses/);
  });
});

describe('assertPublicHttpUrlSync (client-safe half)', () => {
  beforeEach(() => lookup.mockReset());

  it('applies the same shape checks without DNS', () => {
    expect(() => assertPublicHttpUrlSync('http://169.254.169.254/')).toThrow(/not publicly routable/);
    expect(() => assertPublicHttpUrlSync('http://localhost:3000/')).toThrow();
    expect(assertPublicHttpUrlSync('https://feeds.example.com/rss')).toBeInstanceOf(URL);
    expect(lookup).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// safeFetchText
// ─────────────────────────────────────────────────────────────────────────────

describe('safeFetchText', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  function response(
    body: string | Uint8Array,
    init: { status?: number; headers?: Record<string, string> } = {},
  ): Response {
    return new Response(body, { status: init.status ?? 200, headers: init.headers });
  }

  beforeEach(() => {
    lookup.mockReset();
    resolveTo('93.184.216.34');
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it('fetches with redirect: manual and returns text + finalUrl + contentType', async () => {
    fetchMock.mockResolvedValue(
      response('<rss/>', { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } }),
    );

    const result = await safeFetchText('https://feeds.example.com/rss', {
      headers: { 'User-Agent': 'test' },
    });

    expect(result.text).toBe('<rss/>');
    expect(result.finalUrl).toBe('https://feeds.example.com/rss');
    expect(result.contentType).toBe('application/rss+xml; charset=utf-8');
    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('https://feeds.example.com/rss');
    expect(calledInit.redirect).toBe('manual');
    expect(calledInit.headers).toEqual({ 'User-Agent': 'test' });
    expect(calledInit.signal).toBeInstanceOf(AbortSignal);
  });

  it('follows a public redirect and re-validates the hop', async () => {
    fetchMock
      .mockResolvedValueOnce(response('', { status: 301, headers: { location: 'https://cdn.example.net/feed.xml' } }))
      .mockResolvedValueOnce(response('<rss/>'));

    const result = await safeFetchText('https://feeds.example.com/rss');

    expect(result.finalUrl).toBe('https://cdn.example.net/feed.xml');
    expect(lookup).toHaveBeenCalledWith('feeds.example.com', { all: true });
    expect(lookup).toHaveBeenCalledWith('cdn.example.net', { all: true });
  });

  it('SECURITY: refuses to follow a redirect to a private address', async () => {
    fetchMock.mockResolvedValueOnce(
      response('', { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' } }),
    );

    await expect(safeFetchText('https://feeds.example.com/rss')).rejects.toThrow(/not publicly routable/);
    // The private hop must never have been fetched.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('SECURITY: refuses a redirect whose hostname resolves to a private IP', async () => {
    fetchMock.mockResolvedValueOnce(
      response('', { status: 307, headers: { location: 'https://evil.example.org/' } }),
    );
    lookup.mockReset();
    lookup
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]) // feeds.example.com
      .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]); // evil.example.org

    await expect(safeFetchText('https://feeds.example.com/rss')).rejects.toThrow(/127\.0\.0\.1/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('SECURITY: refuses a redirect to a non-standard port / other scheme', async () => {
    fetchMock.mockResolvedValueOnce(
      response('', { status: 302, headers: { location: 'http://feeds.example.com:6379/' } }),
    );
    await expect(safeFetchText('https://feeds.example.com/rss')).rejects.toThrow(/port 6379/i);

    fetchMock.mockResolvedValueOnce(
      response('', { status: 302, headers: { location: 'ftp://feeds.example.com/' } }),
    );
    await expect(safeFetchText('https://feeds.example.com/rss')).rejects.toThrow(/protocol/i);
  });

  it('stops after maxRedirects', async () => {
    fetchMock.mockImplementation(async () =>
      response('', { status: 302, headers: { location: 'https://feeds.example.com/next' } }),
    );
    await expect(safeFetchText('https://feeds.example.com/rss', { maxRedirects: 2 })).rejects.toThrow(
      /too many redirects/i,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 hops, then refuse the 3rd
  });

  it('never validates or fetches a private initial URL', async () => {
    await expect(safeFetchText('http://127.0.0.1:3000/api/admin')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('caps the body at maxBytes (streamed)', async () => {
    const big = new Uint8Array(2048).fill(0x41);
    fetchMock.mockResolvedValue(response(big));

    await expect(safeFetchText('https://feeds.example.com/rss', { maxBytes: 1024 })).rejects.toThrow(
      /too large/i,
    );
  });

  it('caps the body at maxBytes (declared content-length)', async () => {
    fetchMock.mockResolvedValue(response('x', { headers: { 'content-length': '999999999' } }));

    await expect(safeFetchText('https://feeds.example.com/rss', { maxBytes: 1024 })).rejects.toThrow(
      /too large/i,
    );
  });

  it('throws on non-2xx responses', async () => {
    fetchMock.mockResolvedValue(response('nope', { status: 503 }));
    await expect(safeFetchText('https://feeds.example.com/rss')).rejects.toThrow(/HTTP 503/);
  });

  it('honours timeoutMs', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(init.signal.reason));
        }),
    );

    await expect(safeFetchText('https://feeds.example.com/rss', { timeoutMs: 20 })).rejects.toThrow(
      /timed out after 20ms/i,
    );
  });
});
