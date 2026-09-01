/**
 * @jest-environment node
 */
const mockFindMany = jest.fn();
const mockDeliveryFindUnique = jest.fn();
const mockDeliveryCreate = jest.fn();
const mockDebriefFindMany = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    launchWatch: { findMany: (...a: unknown[]) => mockFindMany(...a) },
    spaceEvent: { findMany: (...a: unknown[]) => mockFindMany(...a) },
    launchWatchDelivery: { findUnique: (...a: unknown[]) => mockDeliveryFindUnique(...a), create: (...a: unknown[]) => mockDeliveryCreate(...a) },
    missionDebrief: { findMany: (...a: unknown[]) => mockDebriefFindMany(...a) },
  },
}));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/newsletter/email-service', () => ({ sendVerificationEmail: jest.fn(async () => ({ success: true })) }));

import { alertEmail, debriefEmail, dueKinds, runLaunchWatchDeliveries, scopeLabel, watchMatchesEvent, T24_MS, T1_MS, DEBRIEF_WINDOW_MS } from '@/lib/launch-watch';

const NOW = new Date('2026-08-29T12:00:00Z');
const ev = (over: Partial<Parameters<typeof dueKinds>[0]> = {}) => ({
  id: 'e1', name: 'Falcon 9 Block 5 | Starlink Group 15-30', rocket: 'Falcon 9 Block 5', location: 'Cape Canaveral SFS, FL, USA', agency: 'SpaceX',
  launchDate: new Date(NOW.getTime() + 2 * 3600_000), status: 'go', mission: 'Starlink Group 15-30', ...over,
});

describe('watchMatchesEvent', () => {
  const base = { id: 'w', email: 'a@b.c', eventId: null, rocket: null, site: null, unsubscribeToken: 't' };
  it('matches by event id, rocket substring, or site substring — one scope each', () => {
    expect(watchMatchesEvent({ ...base, eventId: 'e1' }, ev())).toBe(true);
    expect(watchMatchesEvent({ ...base, eventId: 'e2' }, ev())).toBe(false);
    expect(watchMatchesEvent({ ...base, rocket: 'falcon 9' }, ev())).toBe(true);
    expect(watchMatchesEvent({ ...base, rocket: 'Electron' }, ev())).toBe(false);
    expect(watchMatchesEvent({ ...base, site: 'Cape Canaveral' }, ev())).toBe(true);
    expect(watchMatchesEvent({ ...base, site: 'Vandenberg' }, ev())).toBe(false);
    expect(watchMatchesEvent(base, ev())).toBe(false); // no scope never matches
  });
});

describe('dueKinds', () => {
  it('T-24h window (1h..24h out), T-1h window (0..1h), outcome after flight', () => {
    expect(dueKinds(ev({ launchDate: new Date(NOW.getTime() + 20 * 3600_000) }), NOW)).toEqual(['t24']);
    expect(dueKinds(ev({ launchDate: new Date(NOW.getTime() + T1_MS - 1000) }), NOW)).toEqual(['t1']);
    expect(dueKinds(ev({ launchDate: new Date(NOW.getTime() + T24_MS + 1000) }), NOW)).toEqual([]);
    expect(dueKinds(ev({ launchDate: new Date(NOW.getTime() - 3600_000), status: 'completed' }), NOW)).toEqual(['outcome']);
    expect(dueKinds(ev({ launchDate: new Date(NOW.getTime() - 3600_000), status: 'failed' }), NOW)).toEqual(['outcome']);
    expect(dueKinds(ev({ launchDate: new Date(NOW.getTime() - 20 * 3600_000), status: 'completed' }), NOW)).toEqual([]); // too old
    expect(dueKinds(ev({ launchDate: new Date(NOW.getTime() - 3600_000), status: 'scrubbed' }), NOW)).toEqual([]); // no outcome recorded
    expect(dueKinds(ev({ launchDate: null }), NOW)).toEqual([]);
  });

  it("'debrief' is due only for a flown launch inside the 7-day window when the caller says a debrief is published", () => {
    const flownRecently = ev({ launchDate: new Date(NOW.getTime() - 3600_000), status: 'completed' });
    expect(dueKinds(flownRecently, NOW, { debriefAvailable: true })).toEqual(['outcome', 'debrief']);
    expect(dueKinds(flownRecently, NOW, { debriefAvailable: false })).toEqual(['outcome']);
    expect(dueKinds(flownRecently, NOW)).toEqual(['outcome']); // stays pure: default is no debrief
    // outcome window closed, debrief window open
    expect(dueKinds(ev({ launchDate: new Date(NOW.getTime() - 3 * 24 * 3600_000), status: 'failed' }), NOW, { debriefAvailable: true })).toEqual(['debrief']);
    expect(dueKinds(ev({ launchDate: new Date(NOW.getTime() - DEBRIEF_WINDOW_MS - 1000), status: 'completed' }), NOW, { debriefAvailable: true })).toEqual([]);
    // not flown → never a debrief, even if one is (wrongly) published
    expect(dueKinds(ev({ launchDate: new Date(NOW.getTime() - 3600_000), status: 'scrubbed' }), NOW, { debriefAvailable: true })).toEqual([]);
    expect(dueKinds(ev({ launchDate: new Date(NOW.getTime() + 30 * 60_000) }), NOW, { debriefAvailable: true })).toEqual(['t1']);
  });
});

describe('debriefEmail', () => {
  it('uses the debrief subject, summary, three takeaways, the debrief link and the unsubscribe link', () => {
    const d = { slug: 'starlink-15-30', missionName: 'Starlink Group 15-30', executiveSummary: 'Nominal ascent; booster landed on OCISLY.', keyTakeaways: ['One', 'Two', 'Three', 'Four'] };
    const m = debriefEmail(ev({ status: 'completed' }), d, 'tok');
    expect(m.subject).toBe('Debrief: Starlink Group 15-30 — what happened and why');
    expect(m.text).toContain('Nominal ascent; booster landed on OCISLY.');
    expect(m.text).toContain('- Three');
    expect(m.text).not.toContain('- Four');
    expect(m.text).toContain('/mission-debriefs/starlink-15-30');
    expect(m.text).toContain('/api/launch-watch/unsubscribe?token=tok');
    expect(m.html).toContain('<li>One</li>');
    expect(debriefEmail(ev(), { ...d, executiveSummary: '<b>x</b>' }, 'tok').html).not.toContain('<b>x</b>');
  });
});

describe('alertEmail', () => {
  it('writes human subjects and includes the launch link and unsubscribe link', () => {
    const t24 = alertEmail('t24', ev(), 'tok');
    expect(t24.subject).toMatch(/^Tomorrow: Starlink Group 15-30/);
    expect(t24.text).toContain('/launch/e1');
    expect(t24.text).toContain('/api/launch-watch/unsubscribe?token=tok');
    expect(alertEmail('t1', ev(), 'tok').subject).toBe('T-1 hour: Starlink Group 15-30');
    expect(alertEmail('outcome', ev({ status: 'completed' }), 'tok').subject).toBe('Launched: Starlink Group 15-30');
    expect(alertEmail('outcome', ev({ status: 'failed' }), 'tok').subject).toBe('Launch failure: Starlink Group 15-30');
    expect(alertEmail('t1', ev({ name: '<b>x</b>' }), 'tok').html).not.toContain('<b>x</b>');
  });
});

describe('scopeLabel', () => {
  it('describes each scope', () => {
    expect(scopeLabel({ eventId: 'e', eventName: 'Artemis III' })).toBe('the Artemis III launch');
    expect(scopeLabel({ rocket: 'Electron' })).toBe('every Electron launch');
    expect(scopeLabel({ site: 'Vandenberg' })).toBe('every launch from Vandenberg');
  });
});

describe('runLaunchWatchDeliveries', () => {
  beforeEach(() => { mockFindMany.mockReset(); mockDeliveryFindUnique.mockReset(); mockDeliveryCreate.mockReset(); mockDeliveryCreate.mockResolvedValue({}); mockDebriefFindMany.mockReset(); mockDebriefFindMany.mockResolvedValue([]); });

  it('sends each due kind once per (watch, event) and records it', async () => {
    mockFindMany
      .mockResolvedValueOnce([{ id: 'w1', email: 'a@b.c', eventId: null, rocket: 'Falcon 9', site: null, unsubscribeToken: 't1' }, { id: 'w2', email: 'z@b.c', eventId: null, rocket: 'Electron', site: null, unsubscribeToken: 't2' }])
      .mockResolvedValueOnce([ev({ launchDate: new Date(NOW.getTime() + 30 * 60_000) })]);
    mockDeliveryFindUnique.mockResolvedValue(null);
    const sent: string[] = [];
    const r = await runLaunchWatchDeliveries(NOW, async (to, subject) => { sent.push(`${to}:${subject}`); return true; });
    expect(r).toEqual({ watches: 2, events: 1, sent: 1, skipped: 0 });
    expect(sent).toEqual(['a@b.c:T-1 hour: Starlink Group 15-30']);
    expect(mockDeliveryCreate).toHaveBeenCalledWith({ data: { watchId: 'w1', eventId: 'e1', kind: 't1' } });
  });

  it('never repeats a delivery', async () => {
    mockFindMany
      .mockResolvedValueOnce([{ id: 'w1', email: 'a@b.c', eventId: 'e1', rocket: null, site: null, unsubscribeToken: 't1' }])
      .mockResolvedValueOnce([ev({ launchDate: new Date(NOW.getTime() + 30 * 60_000) })]);
    mockDeliveryFindUnique.mockResolvedValue({ id: 'already' });
    const r = await runLaunchWatchDeliveries(NOW, async () => true);
    expect(r.sent).toBe(0);
  });

  it('does not record a delivery the provider rejected, so it retries next run', async () => {
    mockFindMany
      .mockResolvedValueOnce([{ id: 'w1', email: 'a@b.c', eventId: 'e1', rocket: null, site: null, unsubscribeToken: 't1' }])
      .mockResolvedValueOnce([ev({ launchDate: new Date(NOW.getTime() + 30 * 60_000) })]);
    mockDeliveryFindUnique.mockResolvedValue(null);
    const r = await runLaunchWatchDeliveries(NOW, async () => false);
    expect(r).toMatchObject({ sent: 0, skipped: 1 });
    expect(mockDeliveryCreate).not.toHaveBeenCalled();
  });

  it("sends the 'debrief' follow-up once a published debrief exists for a flown launch, and never twice", async () => {
    const flown = ev({ launchDate: new Date(NOW.getTime() - 2 * 24 * 3600_000), status: 'completed' });
    mockFindMany
      .mockResolvedValueOnce([{ id: 'w1', email: 'a@b.c', eventId: 'e1', rocket: null, site: null, unsubscribeToken: 't1' }])
      .mockResolvedValueOnce([flown]);
    mockDebriefFindMany.mockResolvedValue([{ eventId: 'e1', slug: 'starlink-15-30', missionName: 'Starlink Group 15-30', executiveSummary: 'Nominal.', keyTakeaways: ['A'] }]);
    // outcome already delivered, debrief not yet
    mockDeliveryFindUnique.mockImplementation(async (args: { where: { watchId_eventId_kind: { kind: string } } }) =>
      args.where.watchId_eventId_kind.kind === 'debrief' ? null : { id: 'already' });
    const sent: string[] = [];
    const r = await runLaunchWatchDeliveries(NOW, async (to, subject) => { sent.push(`${to}:${subject}`); return true; });
    expect(mockDebriefFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { eventId: { in: ['e1'] }, publishedAt: { not: null } } }));
    expect(sent).toEqual(['a@b.c:Debrief: Starlink Group 15-30 — what happened and why']);
    expect(mockDeliveryCreate).toHaveBeenCalledWith({ data: { watchId: 'w1', eventId: 'e1', kind: 'debrief' } });
    expect(r.sent).toBe(1);
  });

  it('sends no debrief when the debrief is unpublished or the launch has not flown', async () => {
    mockFindMany
      .mockResolvedValueOnce([{ id: 'w1', email: 'a@b.c', eventId: 'e1', rocket: null, site: null, unsubscribeToken: 't1' }])
      .mockResolvedValueOnce([ev({ launchDate: new Date(NOW.getTime() - 2 * 24 * 3600_000), status: 'completed' })]);
    mockDebriefFindMany.mockResolvedValue([]); // the query itself filters publishedAt != null
    mockDeliveryFindUnique.mockResolvedValue(null);
    const r = await runLaunchWatchDeliveries(NOW, async () => true);
    expect(r.sent).toBe(0);
  });
});
