/**
 * SSRF guard — server half.
 *
 * Use this module (not `./safe-url-core`) from any server-side code that is
 * about to fetch a URL that came from a request body, a query param, or a
 * database column that untrusted users can write (podcast feedUrl, etc.).
 *
 *   assertPublicHttpUrl(url)  — parse + shape checks + DNS resolution; throws
 *                               if ANY resolved address is private/loopback/
 *                               link-local (defeats rebinding to 169.254.x).
 *   safeFetchText(url, opts)  — fetch with manual redirects, re-validating
 *                               every hop, a hard byte cap on the body, and an
 *                               overall timeout. Returns the body as text.
 *
 * Pure Node — no Next.js imports — so it is usable from cron routes, lib
 * fetchers, and scripts alike. The sync checks are re-exported from
 * `./safe-url-core` so callers only need one import.
 */

import * as dns from 'dns';
import {
  assertPublicHttpUrlSync,
  ipVersion,
  isPrivateAddress,
  normalizeHostname,
} from './safe-url-core';

export {
  assertPublicHttpUrlSync,
  ipVersion,
  isPrivateAddress,
  isPublicHttpUrlSync,
  normalizeHostname,
} from './safe-url-core';

/**
 * Parse `url`, apply the synchronous policy checks, then resolve the hostname
 * and reject if ANY A/AAAA answer is a private address. Throws an Error with a
 * short reason; resolves to the parsed URL otherwise.
 */
export async function assertPublicHttpUrl(url: string): Promise<URL> {
  const parsed = assertPublicHttpUrlSync(url);
  const host = normalizeHostname(parsed.hostname);

  // IP literal — already vetted by the sync check, nothing to resolve.
  if (ipVersion(host) !== 0) return parsed;

  let answers: Array<{ address: string; family: number }>;
  try {
    answers = await dns.promises.lookup(host, { all: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    throw new Error(`DNS lookup failed for ${host}${code ? ` (${code})` : ''}`);
  }

  if (!answers || answers.length === 0) {
    throw new Error(`DNS lookup returned no addresses for ${host}`);
  }

  for (const { address } of answers) {
    if (isPrivateAddress(address)) {
      throw new Error(`Host ${host} resolves to a non-public address (${address})`);
    }
  }

  return parsed;
}

export interface SafeFetchOptions {
  /** Hard cap on response body bytes. Default 5 MB. */
  maxBytes?: number;
  /** Overall deadline covering every redirect hop and the body read. Default 20 s. */
  timeoutMs?: number;
  /** Maximum redirects to follow (each re-validated). Default 5. */
  maxRedirects?: number;
  /** Extra request headers (User-Agent, Accept, ...). */
  headers?: Record<string, string>;
  /** HTTP method. Default GET. */
  method?: 'GET' | 'HEAD';
}

export interface SafeFetchResult {
  text: string;
  finalUrl: string;
  contentType: string | null;
  status: number;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function charsetFromContentType(ct: string | null): string | null {
  if (!ct) return null;
  const m = /charset\s*=\s*"?([\w.:-]+)"?/i.exec(ct);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Fetch `url` as text with SSRF protections:
 *   - the initial URL and every redirect Location go through assertPublicHttpUrl
 *   - redirects are followed manually (fetch's auto-follow would skip the check)
 *   - the body is streamed and aborted once it exceeds `maxBytes`
 *   - one AbortController deadline covers the whole exchange
 */
export async function safeFetchText(
  url: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const {
    maxBytes = 5_000_000,
    timeoutMs = 20_000,
    maxRedirects = 5,
    headers,
    method = 'GET',
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);

  try {
    let current = url;
    for (let hop = 0; ; hop++) {
      const target = await assertPublicHttpUrl(current);

      const res = await fetch(target.toString(), {
        method,
        headers,
        redirect: 'manual',
        signal: controller.signal,
        cache: 'no-store',
      });

      if (REDIRECT_STATUSES.has(res.status)) {
        const location = res.headers.get('location');
        // Discard the redirect body so the socket is released.
        await res.body?.cancel().catch(() => undefined);
        if (!location) throw new Error(`Redirect (${res.status}) without a Location header`);
        if (hop >= maxRedirects) throw new Error(`Too many redirects (>${maxRedirects})`);
        let next: URL;
        try {
          next = new URL(location, target);
        } catch {
          throw new Error('Redirect to an invalid URL');
        }
        current = next.toString();
        continue;
      }

      if (!res.ok) {
        await res.body?.cancel().catch(() => undefined);
        throw new Error(`HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`);
      }

      const contentType = res.headers.get('content-type');
      const declared = Number(res.headers.get('content-length') || '0');
      if (declared > maxBytes) {
        await res.body?.cancel().catch(() => undefined);
        throw new Error(`Response too large (${declared} bytes > ${maxBytes})`);
      }

      const chunks: Uint8Array[] = [];
      let received = 0;
      if (res.body) {
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            received += value.byteLength;
            if (received > maxBytes) {
              await reader.cancel().catch(() => undefined);
              throw new Error(`Response too large (>${maxBytes} bytes)`);
            }
            chunks.push(value);
          }
        }
      }

      const bytes = new Uint8Array(received);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.byteLength;
      }

      let decoder: TextDecoder;
      try {
        decoder = new TextDecoder(charsetFromContentType(contentType) || 'utf-8');
      } catch {
        decoder = new TextDecoder('utf-8');
      }

      return {
        text: decoder.decode(bytes),
        finalUrl: target.toString(),
        contentType,
        status: res.status,
      };
    }
  } catch (err) {
    // Surface the timeout reason instead of a bare AbortError.
    if (controller.signal.aborted && controller.signal.reason instanceof Error) {
      throw controller.signal.reason;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
