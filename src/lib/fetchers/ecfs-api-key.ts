/**
 * The API key for the FCC's ECFS (Electronic Comment Filing System) endpoint.
 *
 * Until 2026 `https://publicapi.fcc.gov/ecfs/filings` answered unauthenticated
 * requests, and both of our ECFS fetchers were written against that. It does
 * not any more — a keyless request now returns:
 *
 *   403 {"error":{"code":"API_KEY_MISSING","message":"No api_key was supplied."}}
 *
 * Both fetchers fail silently behind a circuit breaker, so this surfaced as
 * "the spectrum feed has no rows", never as an error. Verified against the
 * live endpoint 2026-09-14.
 *
 * ONE KEY SERVES BOTH FEDERAL FEEDS. ECFS and congress.gov both sit behind
 * the same api.data.gov gateway (the responses carry `X-Api-Umbrella-*`
 * headers), and the key issued by https://api.congress.gov/sign-up/ was
 * confirmed working against ECFS on 2026-09-14. So `CONGRESS_GOV_API_KEY` is
 * the fallback here and no separate FCC registration is required.
 * `FCC_API_KEY` still wins when set, in case the two ever diverge.
 *
 * With neither set the fetchers skip without touching the network, exactly
 * as congress-fetcher.ts does — a 403 loop helps nobody.
 */
export function ecfsApiKey(): string | null {
  const key = process.env.FCC_API_KEY || process.env.CONGRESS_GOV_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

/** True when an ECFS-backed feed can run at all. */
export function hasEcfsApiKey(): boolean {
  return ecfsApiKey() !== null;
}
