/**
 * @jest-environment node
 *
 * Launch calendar (2026-09-06). The database half is exercised on production;
 * this pins the display-name rule, which decides what an alert-signup label
 * says about a launch whose payload the feed does not know.
 */
jest.mock('@/lib/db', () => ({ __esModule: true, default: {} }));
jest.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

import { launchDisplayName } from '../launch-calendar';

describe('launchDisplayName', () => {
  it('drops the feed\'s "Unknown Payload" placeholder', () => {
    expect(launchDisplayName('Long March 2D/YZ-3 | Unknown Payload', 'Long March 2D')).toBe('Long March 2D/YZ-3');
  });

  it('keeps a real payload name', () => {
    expect(launchDisplayName('Falcon 9 Block 5 | Starlink Group 10-12', 'Falcon 9')).toBe('Falcon 9 Block 5 | Starlink Group 10-12');
  });

  it('falls back to the rocket when nothing else is known', () => {
    expect(launchDisplayName('Unknown Payload', 'Ceres-1')).toBe('Ceres-1 launch');
    expect(launchDisplayName('  | Unknown Payload', 'Ceres-1')).toBe('Ceres-1 launch');
  });

  it('returns the raw name when there is no rocket to fall back to', () => {
    expect(launchDisplayName('Unknown Payload', null)).toBe('Unknown Payload');
  });
});
