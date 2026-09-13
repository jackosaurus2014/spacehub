/**
 * @jest-environment jsdom
 *
 * Asset routes validate funds against the server's last-synced balance while
 * the dashboard shows the client's live figure (2026-09-12). On an
 * `insufficient_funds` refusal the client pushes a sync and retries once.
 */
jest.mock('@/lib/toast', () => ({ toast: { info: jest.fn(), error: jest.fn(), success: jest.fn() } }));

import { requestAssetOp } from '../asset-client';
import { registerSyncNow } from '../sync-bridge';

const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

describe('requestAssetOp funds retry', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; registerSyncNow(null); });

  it('syncs then retries once when the registry refuses on funds, and succeeds', async () => {
    const calls: string[] = [];
    let synced = false;
    registerSyncNow(async () => { synced = true; calls.push('sync'); return { outcome: 'ok' as const }; });
    global.fetch = jest.fn(async () => {
      calls.push('build');
      return synced ? json(200, { instanceId: 'b1' }) : json(400, { error: 'Insufficient funds: GEO Telecom Satellite costs $150.0M (you have $125.0M).', code: 'insufficient_funds' });
    }) as typeof fetch;
    const r = await requestAssetOp('build', { definitionId: 'geo_telecom' }, 'GEO Telecom Satellite order');
    expect(r.kind).toBe('ok');
    expect(calls).toEqual(['build', 'sync', 'build']);
  });

  it('surfaces the refusal when the retry still fails, and retries only once', async () => {
    registerSyncNow(async () => ({ outcome: 'ok' as const }));
    global.fetch = jest.fn(async () => json(400, { error: 'Insufficient funds', code: 'insufficient_funds' })) as typeof fetch;
    const r = await requestAssetOp('build', {}, 'order');
    expect(r.kind).toBe('fail');
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(2);
  });

  it('waits out a server-throttled sync (429 sync_too_frequent) and pushes again before retrying', async () => {
    const calls: string[] = [];
    let pushes = 0;
    registerSyncNow(async () => { pushes++; calls.push('sync' + pushes); return pushes === 1 ? { outcome: 'throttled' as const, retryAfterMs: 20 } : { outcome: 'ok' as const }; });
    global.fetch = jest.fn(async () => { calls.push('build'); return pushes >= 2 ? json(200, { instanceId: 'b2' }) : json(400, { error: 'Insufficient funds', code: 'insufficient_funds' }); }) as typeof fetch;
    const r = await requestAssetOp('build', {}, 'order');
    expect(r.kind).toBe('ok');
    expect(calls).toEqual(['build', 'sync1', 'sync2', 'build']);
  });

  it('does not retry when the forced sync was skipped or failed', async () => {
    registerSyncNow(async () => ({ outcome: 'error' as const }));
    global.fetch = jest.fn(async () => json(400, { error: 'Insufficient funds', code: 'insufficient_funds' })) as typeof fetch;
    expect((await requestAssetOp('build', {}, 'order')).kind).toBe('fail');
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('does not retry without a registered sync (local play) or for other failures', async () => {
    global.fetch = jest.fn(async () => json(400, { error: 'Insufficient funds', code: 'insufficient_funds' })) as typeof fetch;
    expect((await requestAssetOp('build', {}, 'order')).kind).toBe('fail');
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
    registerSyncNow(async () => { throw new Error('should not be called'); });
    global.fetch = jest.fn(async () => json(400, { error: 'Slot taken', code: 'slot_taken' })) as typeof fetch;
    expect((await requestAssetOp('build', {}, 'order')).kind).toBe('fail');
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
  });
});
