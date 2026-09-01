import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Signed ad-impression tokens.
 *
 * `POST /api/ads/impression` charges an advertiser's prepaid budget (CPM per
 * impression, CPC per click). Campaign and placement ids are public — they
 * ride along in the served-ad JSON — so without a proof-of-serve anyone could
 * replay `{campaignId, placementId, type: 'click'}` and drain every budget on
 * the platform.
 *
 * The serve route mints an HMAC-SHA256 token bound to the (campaign,
 * placement) pair it just served; the impression route refuses to record
 * anything that does not carry a valid, unexpired, unused token for the same
 * pair. Tokens are short-lived (6h) and single-use per nonce.
 *
 * Format: `${base64url(JSON payload)}.${hex HMAC-SHA256}`
 * Payload: { c: campaignId, p: placementId, exp: unix ms, n: 16-byte hex nonce, i?: ip }
 *
 * Everything in here is a pure function of its inputs + `process.env` so it
 * can be unit-tested without a database.
 */

export const IMPRESSION_TOKEN_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface ImpressionTokenPayload {
  /** campaignId */
  c: string;
  /** placementId */
  p: string;
  /** expiry, unix ms */
  exp: number;
  /** nonce, 16 random bytes as hex */
  n: string;
  /** client ip at mint time (informational; not enforced on verify) */
  i?: string;
}

export type VerifyFailureReason =
  | 'malformed'
  | 'bad_signature'
  | 'expired'
  | 'campaign_mismatch'
  | 'placement_mismatch';

export type VerifyResult =
  | { ok: true; payload: ImpressionTokenPayload }
  | { ok: false; reason: VerifyFailureReason };

/**
 * Resolve the signing key. Falls back through the secrets that are always
 * present in the Railway environment so no new env var is strictly required.
 * Throws when none is configured — callers decide how to degrade.
 */
export function getImpressionTokenSecret(): string {
  const secret =
    process.env.AD_TOKEN_SECRET || process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      'Ad impression tokens need AD_TOKEN_SECRET (or CRON_SECRET / NEXTAUTH_SECRET) to be set'
    );
  }
  return secret;
}

export function hasImpressionTokenSecret(): boolean {
  return Boolean(
    process.env.AD_TOKEN_SECRET || process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET
  );
}

function sign(payloadB64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadB64).digest('hex');
}

function encodePayload(payload: ImpressionTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(payloadB64: string): ImpressionTokenPayload | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    if (
      typeof obj.c !== 'string' ||
      typeof obj.p !== 'string' ||
      typeof obj.exp !== 'number' ||
      !Number.isFinite(obj.exp) ||
      typeof obj.n !== 'string' ||
      obj.n.length < 16
    ) {
      return null;
    }
    return {
      c: obj.c,
      p: obj.p,
      exp: obj.exp,
      n: obj.n,
      ...(typeof obj.i === 'string' ? { i: obj.i } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Mint a token for an ad that was just served. Throws if no secret is
 * configured (see `getImpressionTokenSecret`).
 */
export function mintImpressionToken(
  input: { campaignId: string; placementId: string; ip?: string },
  now: number = Date.now()
): string {
  const secret = getImpressionTokenSecret();
  const payload: ImpressionTokenPayload = {
    c: input.campaignId,
    p: input.placementId,
    exp: now + IMPRESSION_TOKEN_TTL_MS,
    n: randomBytes(16).toString('hex'),
    ...(input.ip ? { i: input.ip } : {}),
  };
  const payloadB64 = encodePayload(payload);
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

/**
 * Verify a token against the campaign/placement the client claims to be
 * reporting on. Signature is checked first (constant-time), then expiry, then
 * the binding — so a forged token can never learn which check it failed by
 * timing, and a mismatched-but-genuine token is reported precisely.
 */
export function verifyImpressionToken(
  token: unknown,
  expected: { campaignId: string; placementId: string },
  now: number = Date.now()
): VerifyResult {
  if (typeof token !== 'string' || token.length > 2000) {
    return { ok: false, reason: 'malformed' };
  }
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1 || token.indexOf('.', dot + 1) !== -1) {
    return { ok: false, reason: 'malformed' };
  }
  const payloadB64 = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);

  let secret: string;
  try {
    secret = getImpressionTokenSecret();
  } catch {
    // Without a key nothing can be verified; treat as a bad signature rather
    // than throwing from a pure function. The route separately 503s when the
    // secret is missing so this branch is only reachable in odd test setups.
    return { ok: false, reason: 'bad_signature' };
  }

  const expectedSig = sign(payloadB64, secret);
  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' };
  }

  const payload = decodePayload(payloadB64);
  if (!payload) {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.exp <= now) {
    return { ok: false, reason: 'expired' };
  }
  if (payload.c !== expected.campaignId) {
    return { ok: false, reason: 'campaign_mismatch' };
  }
  if (payload.p !== expected.placementId) {
    return { ok: false, reason: 'placement_mismatch' };
  }
  return { ok: true, payload };
}

// ── Single-use nonce store ───────────────────────────────────────────────────
//
// LIMITATION: this is per-process memory. Railway runs one instance today, so
// it is a real replay guard in production; under horizontal scaling each
// replica would keep its own set and a token could be spent once per replica
// (still bounded by the IP-window dedup in `recordImpression`, which is
// database-backed). If we ever scale out, move this to Postgres (unique index
// on nonce) or Redis SETNX with TTL.

const MAX_NONCES = 50_000;
const PRUNE_EVERY_MS = 60_000;

const seenNonces = new Map<string, number>(); // nonce -> exp (unix ms)
let lastPrune = 0;

function pruneNonces(now: number): void {
  if (now - lastPrune < PRUNE_EVERY_MS && seenNonces.size < MAX_NONCES) return;
  lastPrune = now;
  const expired: string[] = [];
  seenNonces.forEach((exp, nonce) => {
    if (exp <= now) expired.push(nonce);
  });
  expired.forEach((nonce) => seenNonces.delete(nonce));
  // Still over the cap after dropping expired entries: evict oldest-inserted
  // (Map preserves insertion order). Losing an old nonce means a replay of
  // that specific token becomes possible again — acceptable versus unbounded
  // memory growth, and the DB-side IP dedup still limits the damage.
  while (seenNonces.size >= MAX_NONCES) {
    const oldest = seenNonces.keys().next();
    if (oldest.done) break;
    seenNonces.delete(oldest.value);
  }
}

/**
 * Mark a nonce as spent. Returns `false` if it was already spent (replay).
 * `exp` bounds how long the nonce is remembered; pass the token's own expiry.
 */
export function consumeNonce(nonce: string, exp: number, now: number = Date.now()): boolean {
  pruneNonces(now);
  if (seenNonces.has(nonce)) {
    return false;
  }
  seenNonces.set(nonce, exp);
  return true;
}

/** Test hook — clears the in-memory nonce store. */
export function _resetNonceStoreForTests(): void {
  seenNonces.clear();
  lastPrune = 0;
}
