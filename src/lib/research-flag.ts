/**
 * The SpaceNexus Research availability flag, with NO dependencies.
 *
 * This lives apart from `src/lib/research.ts` for one reason: `middleware.ts`
 * needs the flag, and research.ts imports Prisma. Pulling Prisma into the
 * middleware bundle breaks the build, so the flag — and only the flag — lives
 * here, and research.ts re-exports it. There is still exactly one definition.
 *
 * Why middleware needs it at all: a Server Component's `redirect()` runs after
 * Next has already resolved the route's `metadata` and flushed the HTML shell,
 * so `/research` answered 200 with the title "SpaceNexus Research — an annual
 * data seat for firms" and was indexable while the tier was switched off
 * (observed in production 2026-09-14). Gating in middleware means the request
 * never reaches the route and nothing about an unlaunched product is emitted.
 *
 * Anything other than the exact string "true" is OFF, so a typo, a "1", a
 * "yes" or an unset var all fail closed.
 *
 * This is AVAILABILITY, never entitlement. Turning it off hides the product;
 * it must never revoke access for someone already subscribed, which is why the
 * /api/research/* routes gate on their own guard instead of on this.
 */
export const RESEARCH_TIER_FLAG_ENV_VAR = 'RESEARCH_TIER_ENABLED';

export function isResearchTierEnabled(): boolean {
  return process.env[RESEARCH_TIER_FLAG_ENV_VAR] === 'true';
}
