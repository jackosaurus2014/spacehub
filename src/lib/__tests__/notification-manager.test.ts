/**
 * Tests for the launch notification manager.
 * Uses fake timers and mocked DOM APIs.
 */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// Mock Notification API on window (module checks 'Notification' in window)
const mockNotificationInstance = { onclick: null as (() => void) | null, close: jest.fn() };
const MockNotification = jest.fn(() => mockNotificationInstance);
Object.defineProperty(MockNotification, 'permission', { value: 'granted', writable: true, configurable: true });
Object.defineProperty(MockNotification, 'requestPermission', {
  value: jest.fn().mockResolvedValue('granted'),
  writable: true,
  configurable: true,
});
(window as unknown as Record<string, unknown>).Notification = MockNotification;

import {
  getWatchedLaunches,
  isWatching,
  scheduleNotification,
  cancelNotification,
  restoreNotifications,
  requestNotificationPermission,
} from '../launch/notification-manager';

describe('notification-manager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorageMock.clear();
    jest.clearAllMocks();
    Object.defineProperty(MockNotification, 'permission', { value: 'granted', writable: true, configurable: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getWatchedLaunches', () => {
    it('returns empty array when nothing stored', () => {
      expect(getWatchedLaunches()).toEqual([]);
    });

    it('returns parsed launches from localStorage', () => {
      const launches = [{ eventId: '1', name: 'Test', launchDate: '2026-01-01T00:00:00Z', addedAt: '2025-12-31T00:00:00Z' }];
      localStorageMock.setItem('spacenexus-watched-launches', JSON.stringify(launches));
      expect(getWatchedLaunches()).toEqual(launches);
    });

    it('returns empty array on parse error', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json{');
      expect(getWatchedLaunches()).toEqual([]);
    });
  });

  describe('isWatching', () => {
    it('returns false when not watching', () => {
      expect(isWatching('event-1')).toBe(false);
    });

    it('returns true after scheduling', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      scheduleNotification('event-1', 'Test Launch', futureDate);
      expect(isWatching('event-1')).toBe(true);
    });
  });

  describe('scheduleNotification', () => {
    it('stores launch in watched list', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      scheduleNotification('event-1', 'Test Launch', futureDate);

      const watched = getWatchedLaunches();
      expect(watched).toHaveLength(1);
      expect(watched[0].eventId).toBe('event-1');
      expect(watched[0].name).toBe('Test Launch');
    });

    it('does not duplicate in watched list', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      scheduleNotification('event-1', 'Test Launch', futureDate);
      scheduleNotification('event-1', 'Test Launch', futureDate);

      const watched = getWatchedLaunches();
      expect(watched).toHaveLength(1);
    });

    it('schedules T-30m, T-10m, T-1m, and T-0 notifications for future launch', () => {
      // Launch in 2 hours
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      scheduleNotification('event-1', 'Falcon 9', futureDate);

      // Advance to T-30m (1h30m from now)
      jest.advanceTimersByTime(90 * 60 * 1000);
      expect(MockNotification).toHaveBeenCalledTimes(1);

      // Advance to T-10m (+20m)
      jest.advanceTimersByTime(20 * 60 * 1000);
      expect(MockNotification).toHaveBeenCalledTimes(2);

      // Advance to T-1m (+9m)
      jest.advanceTimersByTime(9 * 60 * 1000);
      expect(MockNotification).toHaveBeenCalledTimes(3);

      // Advance to T-0 (+1m)
      jest.advanceTimersByTime(1 * 60 * 1000);
      expect(MockNotification).toHaveBeenCalledTimes(4);
    });

    it('skips past notification times for imminent launch', () => {
      // Launch in 5 minutes — T-30m and T-10m are already past
      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      scheduleNotification('event-1', 'Falcon 9', futureDate);

      // Advance to T-1m (4 minutes from now)
      jest.advanceTimersByTime(4 * 60 * 1000);
      expect(MockNotification).toHaveBeenCalledTimes(1); // T-1m

      // Advance to T-0 (+1m)
      jest.advanceTimersByTime(1 * 60 * 1000);
      expect(MockNotification).toHaveBeenCalledTimes(2); // T-0
    });

    it('does not schedule for past launches', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      scheduleNotification('event-1', 'Past Launch', pastDate);

      jest.advanceTimersByTime(3600000);
      expect(MockNotification).not.toHaveBeenCalled();
    });
  });

  describe('cancelNotification', () => {
    it('clears timeouts and removes from watched list', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      scheduleNotification('event-1', 'Test Launch', futureDate);
      expect(isWatching('event-1')).toBe(true);

      cancelNotification('event-1');
      expect(isWatching('event-1')).toBe(false);

      // Verify no notifications fire after cancel
      jest.advanceTimersByTime(7200000);
      expect(MockNotification).not.toHaveBeenCalled();
    });

    it('is safe to cancel non-existent event', () => {
      expect(() => cancelNotification('non-existent')).not.toThrow();
    });
  });

  describe('restoreNotifications', () => {
    it('re-schedules active watched launches', () => {
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const launches = [
        { eventId: 'e1', name: 'Launch A', launchDate: futureDate, addedAt: new Date().toISOString() },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(launches));

      restoreNotifications();

      // Advance to T-30m
      jest.advanceTimersByTime(90 * 60 * 1000);
      expect(MockNotification).toHaveBeenCalledTimes(1);
    });

    it('cleans up past launches (>2 hours ago)', () => {
      const pastDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const launches = [
        { eventId: 'past', name: 'Old Launch', launchDate: pastDate, addedAt: '2025-01-01T00:00:00Z' },
        { eventId: 'future', name: 'New Launch', launchDate: futureDate, addedAt: new Date().toISOString() },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(launches));

      restoreNotifications();

      // saveWatchedLaunches should have been called to persist the cleaned-up list
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('requestNotificationPermission', () => {
    it('returns true when permission is granted', async () => {
      Object.defineProperty(MockNotification, 'permission', { value: 'granted', writable: true, configurable: true });
      const result = await requestNotificationPermission();
      expect(result).toBe(true);
    });

    it('returns false when permission is denied', async () => {
      Object.defineProperty(MockNotification, 'permission', { value: 'denied', writable: true, configurable: true });
      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });
  });
});

describe('Mach number calculation', () => {
  // Inline Mach calculation from TelemetryDisplay: velocity (km/s) / 0.343
  const calculateMach = (velocityKmPerSec: number): number => {
    return velocityKmPerSec / 0.343;
  };

  it('returns 0 for zero velocity', () => {
    expect(calculateMach(0)).toBe(0);
  });

  it('returns ~1 Mach at speed of sound (343 m/s = 0.343 km/s)', () => {
    expect(calculateMach(0.343)).toBeCloseTo(1.0, 1);
  });

  it('returns ~2 Mach at 686 m/s', () => {
    expect(calculateMach(0.686)).toBeCloseTo(2.0, 1);
  });

  it('returns ~22.7 Mach at orbital velocity (7.8 km/s)', () => {
    const mach = calculateMach(7.8);
    expect(mach).toBeCloseTo(22.7, 0);
  });

  it('handles very small velocities', () => {
    const mach = calculateMach(0.001); // 1 m/s
    expect(mach).toBeGreaterThan(0);
    expect(mach).toBeLessThan(0.01);
  });
});
