/**
 * Investor Hub shared helpers
 */
import prisma from '@/lib/db';

/**
 * Generate a URL-friendly slug from a free-form string. Truncated to 80 chars.
 */
export function makeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80);
}

/**
 * Ensure a slug is unique across a given model by appending a short random
 * suffix if a collision is detected.
 */
export async function ensureUniqueThesisSlug(base: string): Promise<string> {
  let slug = base || `thesis-${Date.now()}`;
  const existing = await prisma.investorThesis.findUnique({ where: { slug } });
  if (!existing) return slug;
  slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  return slug;
}

export async function ensureUniqueDealMemoSlug(base: string): Promise<string> {
  let slug = base || `deal-memo-${Date.now()}`;
  const existing = await prisma.dealMemo.findUnique({ where: { slug } });
  if (!existing) return slug;
  slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  return slug;
}

/**
 * Determine whether the current user can author theses / deal memos.
 * Admins can always author. Otherwise, requires verifiedBadge = "investor".
 */
export function canAuthorInvestorContent(user: {
  isAdmin?: boolean | null;
  verifiedBadge?: string | null;
}): boolean {
  if (user.isAdmin) return true;
  return user.verifiedBadge === 'investor';
}
