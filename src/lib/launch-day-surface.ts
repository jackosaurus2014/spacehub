/**
 * Where the anonymous visitor cookie may be set.
 *
 * A ZERO-IMPORT module on purpose. `src/middleware.ts` runs on the edge and
 * this test is needed there, but the obvious home for it —
 * `launch-day-identity.ts` — imports next-auth and next/headers, which must
 * never reach the edge bundle. Same split, and same reason, as
 * `research-flag.ts`.
 *
 * WHY THE SCOPE EXISTS. Until 2026-09-17 middleware set `sn_vid`, a one-year
 * httpOnly UUID, on every page navigation. That gave every visitor to every
 * page a persistent unique identifier, written before the cookie banner had
 * asked them anything. A per-visitor id that outlives the session is not
 * strictly necessary to deliver a launch guide or a jobs board, so it was the
 * kind of thing the banner exists to ask about — and asking for consent while
 * having already set the identifier is worse than either alone.
 *
 * Only the launch-day hub and an individual launch page render the reactions,
 * polls and chat that consume it, and `/api/launch-day/*` is always reached
 * from one of those, so the feature is unchanged for the people using it.
 *
 * It must NOT match `/launches`, `/launch-cadence` or `/launch-slips`. Those
 * are ordinary content pages — `/launches/cape-canaveral/2026-11` was one of
 * our six busiest landing pages the month this was found.
 */
export function isLaunchDaySurface(pathname: string): boolean {
  return pathname === '/launch' || pathname.startsWith('/launch/');
}
