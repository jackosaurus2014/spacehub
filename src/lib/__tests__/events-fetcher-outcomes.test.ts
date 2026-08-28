/**
 * @jest-environment node
 */
/**
 * Launch outcome recording — regression pins for the 2026-08-26 finding that
 * 39/39 launches in 60 days were "scrubbed": the LL2 status mapper compared
 * short abbreviations against long status names and matched nothing, and no
 * code path ever read LL2's previous-launch feed after a mission flew.
 */
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    spaceEvent: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { mapLaunchLibraryStatus, syncRecentLaunchOutcomes } from '@/lib/events-fetcher';

describe('mapLaunchLibraryStatus', () => {
  it('maps the real LL2 status objects (abbrev + long name)', () => {
    expect(mapLaunchLibraryStatus({ abbrev: 'Success', name: 'Launch Successful' })).toBe('completed');
    expect(mapLaunchLibraryStatus({ abbrev: 'Failure', name: 'Launch Failure' })).toBe('failed');
    expect(mapLaunchLibraryStatus({ abbrev: 'Partial Failure', name: 'Launch was a Partial Failure' })).toBe('completed');
    expect(mapLaunchLibraryStatus({ abbrev: 'Go', name: 'Go for Launch' })).toBe('go');
    expect(mapLaunchLibraryStatus({ abbrev: 'TBD', name: 'To Be Determined' })).toBe('tbd');
    expect(mapLaunchLibraryStatus({ abbrev: 'TBC', name: 'To Be Confirmed' })).toBe('tbc');
    expect(mapLaunchLibraryStatus({ abbrev: 'In Flight', name: 'Launch in Flight' })).toBe('in_progress');
    expect(mapLaunchLibraryStatus({ abbrev: 'Hold', name: 'On Hold' })).toBe('upcoming');
  });

  it('accepts the long name alone — the exact input the old mapper silently dropped', () => {
    expect(mapLaunchLibraryStatus('Launch Successful')).toBe('completed');
    expect(mapLaunchLibraryStatus({ name: 'Launch Failure' })).toBe('failed');
  });

  it('defaults unknown and missing statuses to upcoming', () => {
    expect(mapLaunchLibraryStatus(undefined)).toBe('upcoming');
    expect(mapLaunchLibraryStatus('Something New')).toBe('upcoming');
  });
});

describe('syncRecentLaunchOutcomes', () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
    mockCreate.mockReset();
    // Default: the row exists with a pre-flight status, so an outcome is a change.
    mockFindUnique.mockResolvedValue({ id: 'row', status: 'upcoming' });
    mockUpdate.mockResolvedValue({});
    mockCreate.mockResolvedValue({});
  });

  const fetchWith = (results: unknown[], ok = true) =>
    (async () => ({ ok, status: ok ? 200 : 503, json: async () => ({ results }) })) as unknown as typeof fetch;

  it('writes completed/failed onto tracked rows by externalId and updates the launch time', async () => {
    const out = await syncRecentLaunchOutcomes(fetchWith([
      { id: 'a', net: '2026-08-26T09:35:11Z', status: { abbrev: 'Success', name: 'Launch Successful' } },
      { id: 'b', net: '2026-08-25T00:00:00Z', status: { abbrev: 'Failure', name: 'Launch Failure' } },
    ]));
    expect(out).toEqual({ checked: 2, updated: 2, created: 0 });
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    const [first, second] = mockUpdate.mock.calls.map((c) => c[0]);
    expect(first.where).toEqual({ externalId: 'a' });
    expect(first.data.status).toBe('completed');
    expect(first.data.launchDate.toISOString()).toBe('2026-08-26T09:35:11.000Z');
    expect(second.data.status).toBe('failed');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('leaves a row alone when the outcome is already recorded', async () => {
    mockFindUnique.mockResolvedValue({ id: 'row', status: 'completed' });
    const out = await syncRecentLaunchOutcomes(fetchWith([{ id: 'a', status: { abbrev: 'Success', name: 'Launch Successful' } }]));
    expect(out).toEqual({ checked: 1, updated: 0, created: 0 });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('imports a full row for a launch first seen after it flew', async () => {
    mockFindUnique.mockResolvedValue(null);
    const out = await syncRecentLaunchOutcomes(fetchWith([{
      id: 'new', name: 'Falcon 9 Block 5 | Starlink Group 15-22', net: '2026-08-26T09:35:11Z',
      status: { abbrev: 'Success', name: 'Launch Successful' },
      rocket: { configuration: { name: 'Falcon 9', full_name: 'Falcon 9 Block 5' } },
      pad: { name: 'SLC-40', location: { name: 'Cape Canaveral SFS, FL, USA', country_code: 'USA' } },
      mission: { name: 'Starlink Group 15-22', description: 'Starlink batch', type: 'Communications' },
      launch_service_provider: { name: 'SpaceX', country_code: 'USA', type: 'Commercial' },
    }]));
    expect(out).toEqual({ checked: 1, updated: 0, created: 1 });
    const data = mockCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({ externalId: 'new', status: 'completed', rocket: 'Falcon 9 Block 5', location: 'Cape Canaveral SFS, FL, USA', agency: 'SpaceX', mission: 'Starlink Group 15-22' });
    expect(data.launchDate.toISOString()).toBe('2026-08-26T09:35:11.000Z');
  });

  it('skips non-outcome statuses without touching the DB', async () => {
    const out = await syncRecentLaunchOutcomes(fetchWith([
      { id: 'hold', status: { abbrev: 'Hold', name: 'On Hold' } },
      { id: 'tbd', status: { abbrev: 'TBD', name: 'To Be Determined' } },
    ]));
    expect(out).toEqual({ checked: 2, updated: 0, created: 0 });
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('throws on an LL2 error so the caller logs it instead of silently recording nothing', async () => {
    await expect(syncRecentLaunchOutcomes(fetchWith([], false))).rejects.toThrow(/previous-launch API error: 503/);
  });
});
