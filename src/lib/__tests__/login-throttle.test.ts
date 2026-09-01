/**
 * Per-account sign-in lockout (2026-09-01 hardening, H2).
 */
import {
  MAX_FAILURES,
  LOCK_MS,
  WINDOW_MS,
  lockedFor,
  recordFailure,
  recordSuccess,
  _resetLoginThrottle,
} from '../login-throttle';

describe('login-throttle', () => {
  beforeEach(() => _resetLoginThrottle());

  it('is not locked before MAX_FAILURES', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_FAILURES - 1; i++) {
      expect(recordFailure('a@x.com', t0 + i)).toBe(false);
    }
    expect(lockedFor('a@x.com', t0 + 100)).toBe(0);
  });

  it('locks on the MAX_FAILURES-th failure for LOCK_MS', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_FAILURES - 1; i++) recordFailure('a@x.com', t0 + i);
    expect(recordFailure('a@x.com', t0 + 50)).toBe(true);
    expect(lockedFor('a@x.com', t0 + 51)).toBeGreaterThan(0);
    expect(lockedFor('a@x.com', t0 + 50 + LOCK_MS + 1)).toBe(0);
  });

  it('is case-insensitive on the email and clears on success', () => {
    const t0 = 5_000;
    for (let i = 0; i < MAX_FAILURES; i++) recordFailure('A@X.com', t0 + i);
    expect(lockedFor('a@x.com', t0 + 10)).toBeGreaterThan(0);
    recordSuccess('a@x.COM');
    expect(lockedFor('a@x.com', t0 + 11)).toBe(0);
  });

  it('forgets failures older than the window', () => {
    const t0 = 10_000;
    for (let i = 0; i < MAX_FAILURES - 1; i++) recordFailure('b@x.com', t0 + i);
    // One more failure well outside the window must not trip the lock.
    expect(recordFailure('b@x.com', t0 + WINDOW_MS + 1000)).toBe(false);
  });
});
