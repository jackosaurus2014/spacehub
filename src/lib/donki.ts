import { logger } from '@/lib/logger';

/**
 * NASA DONKI with a fallback host (2026-09-10).
 *
 * api.nasa.gov is a gateway in front of CCMC's DONKI web service. On
 * 2026-09-10 the gateway returned 503 for every DONKI endpoint (with a valid
 * key; 429 with DEMO_KEY) while the CCMC host answered 200 with the same JSON.
 * So: try the keyed gateway first, and on any non-OK status or network
 * failure retry the same endpoint on CCMC (no key needed). Callers get the
 * parsed JSON either way, or a thrown Error naming both failures.
 */
export const DONKI_GATEWAY = 'https://api.nasa.gov/DONKI';
export const DONKI_CCMC = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get';

let fallbackWarnedAt = 0;

async function tryFetch(url: string, timeoutMs: number): Promise<{ ok: boolean; status: number | string; body?: unknown }> {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, status: res.status, body: await res.json() };
  } catch (error) {
    return { ok: false, status: error instanceof Error ? error.name : 'error' };
  }
}

export async function fetchDonki<T = unknown>(
  endpoint: string,
  params: Record<string, string> = {},
  opts: { timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const qs = new URLSearchParams(params).toString();
  const gateway = await tryFetch(`${DONKI_GATEWAY}/${endpoint}?${qs}${qs ? '&' : ''}api_key=${process.env.NASA_API_KEY || 'DEMO_KEY'}`, timeoutMs);
  if (gateway.ok) return gateway.body as T;
  const ccmc = await tryFetch(`${DONKI_CCMC}/${endpoint}${qs ? `?${qs}` : ''}`, timeoutMs);
  if (ccmc.ok) {
    if (Date.now() - fallbackWarnedAt > 15 * 60_000) {
      fallbackWarnedAt = Date.now();
      logger.warn('DONKI gateway failed; served from CCMC', { endpoint, gatewayStatus: gateway.status });
    }
    return ccmc.body as T;
  }
  throw new Error(`DONKI ${endpoint} error: gateway ${gateway.status}, ccmc ${ccmc.status}`);
}
