/**
 * @jest-environment node
 *
 * DONKI gateway → CCMC fallback (2026-09-10). The api.nasa.gov gateway
 * returned 503 for every DONKI endpoint that night while CCMC's own host
 * served the same JSON; every DONKI caller now goes through fetchDonki.
 */
import fs from 'fs';
import path from 'path';
import { fetchDonki, DONKI_GATEWAY, DONKI_CCMC } from '../donki';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');
const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

describe('fetchDonki', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('returns the gateway body when the gateway is healthy', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: string | URL | Request) => { calls.push(String(url)); return json([{ flrID: 'x' }]); }) as typeof fetch;
    const out = await fetchDonki<Array<{ flrID: string }>>('FLR', { startDate: '2026-09-01', endDate: '2026-09-10' });
    expect(out[0].flrID).toBe('x');
    expect(calls).toHaveLength(1);
    expect(calls[0].startsWith(`${DONKI_GATEWAY}/FLR?startDate=2026-09-01&endDate=2026-09-10&api_key=`)).toBe(true);
  });

  it('falls back to CCMC on a gateway 503 and never sends the key there', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: string | URL | Request) => {
      calls.push(String(url));
      return String(url).startsWith(DONKI_GATEWAY) ? json({ error: 'down' }, 503) : json([{ gstID: 'y' }]);
    }) as typeof fetch;
    const out = await fetchDonki<Array<{ gstID: string }>>('GST', { startDate: '2026-08-11', endDate: '2026-09-10' });
    expect(out[0].gstID).toBe('y');
    expect(calls).toHaveLength(2);
    expect(calls[1]).toBe(`${DONKI_CCMC}/GST?startDate=2026-08-11&endDate=2026-09-10`);
    expect(calls[1]).not.toMatch(/api_key/);
  });

  it('throws naming both failures when both hosts fail', async () => {
    global.fetch = jest.fn(async () => json(null, 500)) as typeof fetch;
    await expect(fetchDonki('CME')).rejects.toThrow(/DONKI CME error: gateway 500, ccmc 500/);
  });
});

describe('every DONKI caller uses the fallback helper', () => {
  it('no direct api.nasa.gov/DONKI fetches remain outside donki.ts', () => {
    for (const rel of ['src/lib/noaa-fetcher.ts', 'src/lib/external-apis.ts', 'src/lib/module-api-fetchers.ts']) {
      const src = read(rel);
      expect(src).toMatch(/from '@\/lib\/donki'/);
      expect(src).not.toMatch(/fetch\(\s*`https:\/\/api\.nasa\.gov\/DONKI/);
      expect(src).not.toMatch(/NASA_DONKI\.baseUrl\}\/(SEP|RBE|HSS|IPS)/);
    }
  });
  it('Helioviewer gets an ISO 8601 date with T and Z (the space form is rejected)', () => {
    expect(read('src/lib/module-api-fetchers.ts')).toMatch(/const now = new Date\(\)\.toISOString\(\)\.slice\(0, 19\) \+ 'Z'/);
  });
});
