import crypto from 'crypto';

/**
 * API Key management utilities for SpaceNexus Developer API.
 *
 * Keys follow the format: snx_<48 random base64url chars>
 * Keys are never stored in plaintext -- only the SHA-256 hash is persisted.
 */

// Generate a new API key: "snx_" + 48 random chars
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(36).toString('base64url');
  const key = `snx_${raw}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 12);
  return { key, hash, prefix };
}

// Hash a key for lookup
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Rate limit tiers configuration
export const API_RATE_LIMITS = {
  developer: { monthly: 5000, perMinute: 60 },
  business: { monthly: 50000, perMinute: 300 },
  enterprise: { monthly: -1, perMinute: 1000 }, // -1 = unlimited monthly
} as const;

export type ApiTier = keyof typeof API_RATE_LIMITS;

// Max keys per subscription tier
export const MAX_KEYS_PER_TIER: Record<string, number> = {
  developer: 3,
  business: 10,
  enterprise: 999, // effectively unlimited
};

// Mapping: subscription tier -> allowed API tiers
export const SUBSCRIPTION_TO_API_TIERS: Record<string, ApiTier[]> = {
  free: [],
  pro: ['developer'],
  enterprise: ['developer', 'business', 'enterprise'],
};
