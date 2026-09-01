/**
 * SSRF guard — pure, dependency-free half.
 *
 * Everything in this file is synchronous string/number logic with NO Node
 * imports, so it is safe to import from `src/lib/validations.ts` (which is
 * bundled into client components). The DNS-resolving and fetching half lives
 * in `./safe-url.ts`, which re-exports this module for server callers.
 */

// ─── IP literal parsing ──────────────────────────────────────────────────────

/** Parse a dotted-quad IPv4 literal into its four octets, or null. */
function parseIPv4(ip: string): [number, number, number, number] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const octets = [m[1], m[2], m[3], m[4]].map((o) => Number(o));
  if (octets.some((o) => o > 255)) return null;
  return octets as [number, number, number, number];
}

/**
 * Expand an IPv6 literal into eight 16-bit hextets. Handles `::` compression,
 * an embedded trailing dotted-quad (`::ffff:1.2.3.4`), and a zone id suffix
 * (`fe80::1%eth0`). Returns null if the string is not a valid IPv6 address.
 */
function parseIPv6(raw: string): number[] | null {
  let ip = raw;
  const zone = ip.indexOf('%');
  if (zone !== -1) ip = ip.slice(0, zone);
  if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
  if (!ip.includes(':')) return null;

  // Embedded IPv4 tail → two hextets
  let tail: number[] = [];
  const lastColon = ip.lastIndexOf(':');
  const lastPart = ip.slice(lastColon + 1);
  if (lastPart.includes('.')) {
    const v4 = parseIPv4(lastPart);
    if (!v4) return null;
    tail = [(v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]];
    ip = ip.slice(0, lastColon + 1);
    // "::1.2.3.4" → after slicing we have "::" ; "a::1.2.3.4" → "a::"
    if (ip.endsWith(':') && !ip.endsWith('::')) ip = ip.slice(0, -1);
  }

  const dbl = ip.indexOf('::');
  if (dbl !== ip.lastIndexOf('::')) return null; // more than one "::"

  const toHextets = (s: string): number[] | null => {
    if (s === '') return [];
    const parts = s.split(':');
    const out: number[] = [];
    for (const p of parts) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(p)) return null;
      out.push(parseInt(p, 16));
    }
    return out;
  };

  let hextets: number[];
  if (dbl !== -1) {
    const head = toHextets(ip.slice(0, dbl));
    const rest = toHextets(ip.slice(dbl + 2));
    if (!head || !rest) return null;
    const fill = 8 - head.length - rest.length - tail.length;
    if (fill < 0) return null;
    hextets = [...head, ...new Array(fill).fill(0), ...rest, ...tail];
  } else {
    const all = toHextets(ip);
    if (!all) return null;
    hextets = [...all, ...tail];
  }

  return hextets.length === 8 ? hextets : null;
}

/** 0 = not an IP literal, 4 = IPv4, 6 = IPv6. Mirrors `net.isIP`. */
export function ipVersion(ip: string): 0 | 4 | 6 {
  if (parseIPv4(ip)) return 4;
  if (parseIPv6(ip)) return 6;
  return 0;
}

// ─── Private / non-routable range checks ─────────────────────────────────────

function isPrivateIPv4Octets(o: [number, number, number, number]): boolean {
  const [a, b] = o;
  if (a === 0) return true; // 0.0.0.0/8 "this" network
  if (a === 10) return true; // 10/8
  if (a === 127) return true; // 127/8 loopback
  if (a === 169 && b === 254) return true; // 169.254/16 link-local (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 192 && b === 0 && o[2] === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18/15 benchmarking
  if (a >= 224 && a <= 239) return true; // 224/4 multicast
  if (a >= 240) return true; // 240/4 reserved + 255.255.255.255 broadcast
  return false;
}

/**
 * True if `ip` is a loopback, link-local, private, CGNAT, multicast, reserved,
 * or otherwise non-publicly-routable address. Unparseable input is treated as
 * private (fail closed).
 *
 * IPv4: 0/8, 10/8, 127/8, 169.254/16, 172.16/12, 192.168/16, 192.0.0/24,
 *       100.64/10, 198.18/15, 224/4, 240/4 (incl. 255.255.255.255).
 * IPv6: ::, ::1, fc00::/7 (ULA), fe80::/10 (link-local), ff00::/8 (multicast),
 *       ::ffff:a.b.c.d (v4-mapped), 64:ff9b::/96 (NAT64), 2002::/16 (6to4) —
 *       the last three are unwrapped and checked as IPv4.
 */
export function isPrivateAddress(ip: string): boolean {
  const trimmed = ip.trim();
  const v4 = parseIPv4(trimmed);
  if (v4) return isPrivateIPv4Octets(v4);

  const h = parseIPv6(trimmed);
  if (!h) return true; // not an IP at all → fail closed

  const allZeroPrefix = (n: number) => h.slice(0, n).every((x) => x === 0);

  // :: (unspecified) and ::1 (loopback)
  if (allZeroPrefix(7) && (h[7] === 0 || h[7] === 1)) return true;

  // ::ffff:a.b.c.d — IPv4-mapped
  if (allZeroPrefix(5) && h[5] === 0xffff) {
    return isPrivateIPv4Octets([h[6] >> 8, h[6] & 0xff, h[7] >> 8, h[7] & 0xff]);
  }
  // ::a.b.c.d — deprecated IPv4-compatible
  if (allZeroPrefix(6)) {
    return isPrivateIPv4Octets([h[6] >> 8, h[6] & 0xff, h[7] >> 8, h[7] & 0xff]);
  }
  // 64:ff9b::/96 — NAT64 well-known prefix
  if (h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0)) {
    return isPrivateIPv4Octets([h[6] >> 8, h[6] & 0xff, h[7] >> 8, h[7] & 0xff]);
  }
  // 2002::/16 — 6to4, embeds the v4 address in hextets 1-2
  if (h[0] === 0x2002) {
    return isPrivateIPv4Octets([h[1] >> 8, h[1] & 0xff, h[2] >> 8, h[2] & 0xff]);
  }

  if ((h[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((h[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((h[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 deprecated site-local
  if ((h[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast

  return false;
}

// ─── Synchronous URL shape checks (no DNS) ───────────────────────────────────

const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.localhost', '.home.arpa', '.onion'];

/**
 * Normalise a URL hostname for policy checks: lower-case, strip a trailing
 * dot, strip IPv6 brackets.
 */
export function normalizeHostname(hostname: string): string {
  let h = hostname.toLowerCase();
  if (h.endsWith('.')) h = h.slice(0, -1);
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  return h;
}

/**
 * Parse `url` and apply every check that does NOT require network access:
 *   - protocol is http: or https:
 *   - no embedded credentials
 *   - port is empty, 80 or 443
 *   - hostname is not localhost / *.local / *.internal / *.localhost / etc.
 *   - if the hostname is an IP literal, it is not a private address
 *
 * Returns the parsed URL, or throws an Error with a short reason. DNS
 * resolution is deliberately left to `assertPublicHttpUrl` in ./safe-url.ts
 * (it must run at fetch time anyway, to defeat rebinding).
 */
export function assertPublicHttpUrlSync(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${parsed.protocol.replace(/:$/, '')}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error('URL must not contain credentials');
  }
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    throw new Error(`Port ${parsed.port} is not allowed`);
  }

  const host = normalizeHostname(parsed.hostname);
  if (!host) throw new Error('URL has no host');
  if (host === 'localhost') throw new Error('Host localhost is not allowed');
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (host.endsWith(suffix)) throw new Error(`Host ${host} is not allowed`);
  }

  if (ipVersion(host) !== 0 && isPrivateAddress(host)) {
    throw new Error(`Address ${host} is not publicly routable`);
  }

  return parsed;
}

/** Boolean convenience wrapper around `assertPublicHttpUrlSync` for zod refines. */
export function isPublicHttpUrlSync(url: string): boolean {
  try {
    assertPublicHttpUrlSync(url);
    return true;
  } catch {
    return false;
  }
}
