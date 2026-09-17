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

/**
 * Whether this request is a person actually opening the page, as opposed to
 * the router fetching it in the background.
 *
 * FOUND 2026-09-17, after scoping `sn_vid` to /launch did not stop it being
 * set on a cost guide. `/guide/space-launch-cost-comparison` links to a launch
 * page, Next.js prefetches links that enter the viewport, and that prefetch is
 * a real request through middleware — so a reader who never visited a launch
 * page still came away carrying the identifier. Scoping the path was necessary
 * and not sufficient.
 *
 * A navigation carries `Sec-Fetch-Dest: document`. A prefetch or an RSC
 * payload fetch carries `RSC: 1` (and usually `Next-Router-Prefetch: 1`) with
 * `Sec-Fetch-Dest: empty`. A client too old to send Sec-Fetch-Dest at all is
 * treated as a navigation, because refusing there would break the feature for
 * a real visitor; an `RSC` header still disqualifies it.
 */
export function isDocumentNavigation(headers: {
  get(name: string): string | null;
}): boolean {
  if (headers.get('rsc')) return false;
  if (headers.get('next-router-prefetch')) return false;
  const dest = headers.get('sec-fetch-dest');
  if (dest === null) return true;
  return dest === 'document';
}
