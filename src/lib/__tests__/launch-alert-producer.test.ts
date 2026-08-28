/**
 * @jest-environment node
 */
/**
 * Launch alerts were dead wiring until 2026-08-28: rules could be created
 * but no code path ever called processAlerts('launch_status', …). These pin
 * the producer (transitions recorded by the syncs) and the richer matcher
 * (rocket + site filters) that the /rockets and /launches CTAs rely on.
 */
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    spaceEvent: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

import { drainLaunchStatusTransitions, syncRecentLaunchOutcomes, transitionToAlertData } from '@/lib/events-fetcher';
import { matchLaunchStatus } from '@/lib/alerts/alert-processor';

const fetchWith = (results: unknown[]) =>
  (async () => ({ ok: true, status: 200, json: async () => ({ results }) })) as unknown as typeof fetch;

const F9 = {
  id: 'f9', name: 'Falcon 9 Block 5 | Starlink Group 15-22', net: '2026-08-26T09:35:11Z',
  status: { abbrev: 'Success', name: 'Launch Successful' },
  rocket: { configuration: { name: 'Falcon 9', full_name: 'Falcon 9 Block 5' } },
  pad: { name: 'SLC-40', location: { name: 'Cape Canaveral SFS, FL, USA', country_code: 'USA' } },
  mission: { name: 'Starlink Group 15-22', description: '', type: 'Communications' },
  launch_service_provider: { name: 'SpaceX', country_code: 'USA', type: 'Commercial' },
};

describe('launch status transition producer', () => {
  beforeEach(() => {
    mockFindUnique.mockReset(); mockUpdate.mockReset(); mockCreate.mockReset();
    mockUpdate.mockResolvedValue({}); mockCreate.mockResolvedValue({});
    drainLaunchStatusTransitions();
  });

  it('records a transition when a tracked launch gains an outcome', async () => {
    mockFindUnique.mockResolvedValue({ id: 'row-1', status: 'go' });
    await syncRecentLaunchOutcomes(fetchWith([F9]));
    const t = drainLaunchStatusTransitions();
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ eventId: 'row-1', from: 'go', to: 'completed' });
    expect(drainLaunchStatusTransitions()).toHaveLength(0); // drained exactly once
  });

  it('does not record a transition for a launch first seen after it flew (no subscriber could have been waiting)', async () => {
    mockFindUnique.mockResolvedValue(null);
    await syncRecentLaunchOutcomes(fetchWith([F9]));
    expect(drainLaunchStatusTransitions()).toHaveLength(0);
  });

  it('shapes alert data the matcher and template read', () => {
    const data = transitionToAlertData({ eventId: 'row-1', launch: F9 as never, from: 'go', to: 'completed' });
    expect(data).toMatchObject({ status: 'success', provider: 'SpaceX', rocket: 'Falcon 9 Block 5', missionName: 'Starlink Group 15-22', location: 'Cape Canaveral SFS, FL, USA', url: 'https://spacenexus.us/launch/row-1' });
    expect(transitionToAlertData({ eventId: 'x', launch: F9 as never, from: 'upcoming', to: 'failed' }).status).toBe('failure');
    expect(transitionToAlertData({ eventId: 'x', launch: F9 as never, from: 'upcoming', to: 'in_progress' }).status).toBe('in_flight');
    expect(transitionToAlertData({ eventId: 'x', launch: F9 as never, from: 'upcoming', to: 'go' }).status).toBe('go');
  });
});

describe('matchLaunchStatus with rocket and site filters', () => {
  const data = { provider: 'SpaceX', status: 'success', rocket: 'Falcon 9 Block 5', location: 'Cape Canaveral SFS, FL, USA' };

  it('matches on rocket substring, case-insensitively', () => {
    expect(matchLaunchStatus({ rockets: ['falcon 9'] }, data)).toBe(true);
    expect(matchLaunchStatus({ rockets: ['Electron'] }, data)).toBe(false);
  });
  it('matches on site substring', () => {
    expect(matchLaunchStatus({ sites: ['Cape Canaveral'] }, data)).toBe(true);
    expect(matchLaunchStatus({ sites: ['Vandenberg'] }, data)).toBe(false);
  });
  it('combines filters with AND, and empty filters mean any', () => {
    expect(matchLaunchStatus({ rockets: ['Falcon 9'], sites: ['Vandenberg'] }, data)).toBe(false);
    expect(matchLaunchStatus({ rockets: ['Falcon 9'], sites: ['Cape Canaveral'], statusChanges: ['success'] }, data)).toBe(true);
    expect(matchLaunchStatus({}, data)).toBe(true);
    expect(matchLaunchStatus({ rockets: [], sites: [] }, data)).toBe(true);
  });
  it('a rocket filter never matches data with no rocket', () => {
    expect(matchLaunchStatus({ rockets: ['Falcon 9'] }, { provider: 'SpaceX', status: 'success' })).toBe(false);
  });
});
