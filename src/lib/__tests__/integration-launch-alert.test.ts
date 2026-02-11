/**
 * @jest-environment node
 */

/**
 * Integration tests for launch alert processing.
 *
 * Launch alerts are handled by the general-purpose processAlerts function
 * in alert-processor.ts using triggerType='launch_status'.  The
 * matchLaunchStatus matcher checks provider and status against the rule's
 * LaunchStatusConfig, and AlertDelivery records are created for each
 * matching channel.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    alertRule: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    alertHistory: {
      create: jest.fn().mockResolvedValue({ id: 'history-1' }),
    },
    alertDelivery: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  } as any;
}

// ── Import under test ────────────────────────────────────────────────────────

import { processAlerts, matchLaunchStatus } from '@/lib/alerts/alert-processor';
import type { LaunchStatusConfig } from '@/lib/alerts/alert-processor';

// ── Test data factories ──────────────────────────────────────────────────────

function makeLaunchRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-launch-1',
    userId: 'user-1',
    name: 'SpaceX Launch Updates',
    triggerConfig: {
      providers: ['SpaceX'],
      statusChanges: ['go', 'scrub', 'success', 'failure'],
    } as LaunchStatusConfig,
    channels: ['in_app', 'email'],
    priority: 'high',
    lastTriggeredAt: null,
    cooldownMinutes: 30,
    ...overrides,
  };
}

function makeLaunchData(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'SpaceX',
    status: 'go',
    missionName: 'Starlink Group 6-42',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for matchLaunchStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('matchLaunchStatus — matcher logic', () => {
  it('matches when provider and status are in the config', () => {
    const config: LaunchStatusConfig = {
      providers: ['SpaceX'],
      statusChanges: ['go', 'scrub'],
    };
    expect(matchLaunchStatus(config, { provider: 'SpaceX', status: 'go' })).toBe(true);
  });

  it('matches case-insensitively for status', () => {
    const config: LaunchStatusConfig = {
      providers: ['SpaceX'],
      statusChanges: ['Go'],
    };
    expect(matchLaunchStatus(config, { provider: 'SpaceX', status: 'go' })).toBe(true);
  });

  it('matches by partial provider name (includes)', () => {
    const config: LaunchStatusConfig = {
      providers: ['SpaceX'],
      statusChanges: ['success'],
    };
    // "SpaceX Falcon 9" includes "SpaceX"
    expect(
      matchLaunchStatus(config, { provider: 'SpaceX Falcon 9', status: 'success' })
    ).toBe(true);
  });

  it('does not match a different provider', () => {
    const config: LaunchStatusConfig = {
      providers: ['SpaceX'],
      statusChanges: ['go'],
    };
    expect(matchLaunchStatus(config, { provider: 'Blue Origin', status: 'go' })).toBe(false);
  });

  it('does not match a non-configured status', () => {
    const config: LaunchStatusConfig = {
      providers: ['SpaceX'],
      statusChanges: ['go', 'scrub'],
    };
    expect(matchLaunchStatus(config, { provider: 'SpaceX', status: 'success' })).toBe(false);
  });

  it('matches any provider when providers list is empty', () => {
    const config: LaunchStatusConfig = {
      providers: [],
      statusChanges: ['success'],
    };
    expect(matchLaunchStatus(config, { provider: 'Rocket Lab', status: 'success' })).toBe(true);
  });

  it('matches any status when statusChanges list is empty', () => {
    const config: LaunchStatusConfig = {
      providers: ['SpaceX'],
      statusChanges: [],
    };
    expect(matchLaunchStatus(config, { provider: 'SpaceX', status: 'failure' })).toBe(true);
  });

  it('matches any provider and status when both lists are undefined', () => {
    const config: LaunchStatusConfig = {};
    expect(
      matchLaunchStatus(config, { provider: 'ULA', status: 'scrub' })
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration tests for processAlerts with launch_status trigger
// ─────────────────────────────────────────────────────────────────────────────

describe('processAlerts — launch_status integration', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  // ── No-op scenarios ────────────────────────────────────────────────────

  describe('no-op when no rules exist', () => {
    it('returns 0 when there are no active rules for launch_status', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([]);

      const count = await processAlerts('launch_status', makeLaunchData(), mockPrisma);

      expect(count).toBe(0);
      expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith({
        where: {
          triggerType: 'launch_status',
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          triggerConfig: true,
          channels: true,
          priority: true,
          lastTriggeredAt: true,
          cooldownMinutes: true,
        },
      });
      expect(mockPrisma.alertHistory.create).not.toHaveBeenCalled();
      expect(mockPrisma.alertDelivery.createMany).not.toHaveBeenCalled();
    });
  });

  describe('no-op when data does not match any rule', () => {
    it('returns 0 when the launch provider does not match', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([makeLaunchRule()]);

      const count = await processAlerts(
        'launch_status',
        makeLaunchData({ provider: 'Blue Origin' }),
        mockPrisma
      );

      expect(count).toBe(0);
      expect(mockPrisma.alertHistory.create).not.toHaveBeenCalled();
      expect(mockPrisma.alertDelivery.createMany).not.toHaveBeenCalled();
    });

    it('returns 0 when the launch status does not match', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        makeLaunchRule({
          triggerConfig: {
            providers: ['SpaceX'],
            statusChanges: ['scrub'],
          },
        }),
      ]);

      const count = await processAlerts(
        'launch_status',
        makeLaunchData({ status: 'go' }),
        mockPrisma
      );

      expect(count).toBe(0);
    });
  });

  // ── Successful trigger ─────────────────────────────────────────────────

  describe('successful alert creation', () => {
    it('creates history + delivery when a rule matches', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([makeLaunchRule()]);

      const data = makeLaunchData({ status: 'go' });
      const count = await processAlerts('launch_status', data, mockPrisma);

      expect(count).toBe(1);

      // AlertHistory record created
      expect(mockPrisma.alertHistory.create).toHaveBeenCalledTimes(1);
      const historyCall = mockPrisma.alertHistory.create.mock.calls[0][0];
      expect(historyCall.data.alertRuleId).toBe('rule-launch-1');
      expect(historyCall.data.userId).toBe('user-1');
      expect(historyCall.data.triggerType).toBe('launch_status');
      expect(historyCall.data.triggerData).toEqual(data);

      // AlertDelivery records created (one per channel)
      expect(mockPrisma.alertDelivery.createMany).toHaveBeenCalledTimes(1);
      const deliveryCall = mockPrisma.alertDelivery.createMany.mock.calls[0][0];
      expect(deliveryCall.data).toHaveLength(2); // in_app + email

      const [inApp, email] = deliveryCall.data;
      expect(inApp.channel).toBe('in_app');
      expect(inApp.userId).toBe('user-1');
      expect(inApp.status).toBe('pending');
      expect(inApp.title).toContain('Launch Status Update');
      expect(inApp.title).toContain('SpaceX');
      expect(inApp.message).toContain('go');
      expect(inApp.data.triggerType).toBe('launch_status');
      expect(inApp.data.priority).toBe('high');

      expect(email.channel).toBe('email');
      expect(email.userId).toBe('user-1');

      // Rule was updated with lastTriggeredAt and triggerCount increment
      expect(mockPrisma.alertRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-launch-1' },
        data: {
          lastTriggeredAt: expect.any(Date),
          triggerCount: { increment: 1 },
        },
      });
    });

    it('includes mission name in the alert message when present', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([makeLaunchRule()]);

      await processAlerts(
        'launch_status',
        makeLaunchData({ missionName: 'Crew Dragon DM-3' }),
        mockPrisma
      );

      const deliveryCall = mockPrisma.alertDelivery.createMany.mock.calls[0][0];
      expect(deliveryCall.data[0].message).toContain('Crew Dragon DM-3');
    });
  });

  // ── Cooldown logic ─────────────────────────────────────────────────────

  describe('cooldown enforcement', () => {
    it('skips a rule that is still within its cooldown window', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      mockPrisma.alertRule.findMany.mockResolvedValue([
        makeLaunchRule({
          lastTriggeredAt: fiveMinutesAgo,
          cooldownMinutes: 30, // Still 25 minutes left in cooldown
        }),
      ]);

      const count = await processAlerts(
        'launch_status',
        makeLaunchData(),
        mockPrisma
      );

      expect(count).toBe(0);
      expect(mockPrisma.alertHistory.create).not.toHaveBeenCalled();
      expect(mockPrisma.alertDelivery.createMany).not.toHaveBeenCalled();
    });

    it('triggers a rule when cooldown has expired', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      mockPrisma.alertRule.findMany.mockResolvedValue([
        makeLaunchRule({
          lastTriggeredAt: twoHoursAgo,
          cooldownMinutes: 30, // 30min cooldown, last triggered 2h ago => expired
        }),
      ]);

      const count = await processAlerts(
        'launch_status',
        makeLaunchData(),
        mockPrisma
      );

      expect(count).toBe(1);
      expect(mockPrisma.alertHistory.create).toHaveBeenCalledTimes(1);
    });

    it('triggers a rule that has never been triggered before (null lastTriggeredAt)', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        makeLaunchRule({ lastTriggeredAt: null }),
      ]);

      const count = await processAlerts(
        'launch_status',
        makeLaunchData(),
        mockPrisma
      );

      expect(count).toBe(1);
    });
  });

  // ── Multiple rules ─────────────────────────────────────────────────────

  describe('multiple matching rules', () => {
    it('triggers all matching rules for the same event', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        makeLaunchRule({ id: 'rule-1', userId: 'user-1' }),
        makeLaunchRule({
          id: 'rule-2',
          userId: 'user-2',
          name: 'All SpaceX Launches',
          channels: ['in_app'],
        }),
      ]);

      const count = await processAlerts(
        'launch_status',
        makeLaunchData(),
        mockPrisma
      );

      expect(count).toBe(2);
      expect(mockPrisma.alertHistory.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.alertDelivery.createMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.alertRule.update).toHaveBeenCalledTimes(2);
    });

    it('triggers only the matching rule when one does not match', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        makeLaunchRule({ id: 'rule-spacex', triggerConfig: { providers: ['SpaceX'], statusChanges: ['go'] } }),
        makeLaunchRule({ id: 'rule-ula', triggerConfig: { providers: ['ULA'], statusChanges: ['go'] } }),
      ]);

      const count = await processAlerts(
        'launch_status',
        makeLaunchData({ provider: 'SpaceX', status: 'go' }),
        mockPrisma
      );

      expect(count).toBe(1);
      expect(mockPrisma.alertHistory.create).toHaveBeenCalledTimes(1);
      const historyCall = mockPrisma.alertHistory.create.mock.calls[0][0];
      expect(historyCall.data.alertRuleId).toBe('rule-spacex');
    });
  });

  // ── Channel variations ─────────────────────────────────────────────────

  describe('channel variations', () => {
    it('creates deliveries for all configured channels', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        makeLaunchRule({
          channels: ['in_app', 'email', 'push', 'webhook'],
        }),
      ]);

      await processAlerts('launch_status', makeLaunchData(), mockPrisma);

      const deliveryCall = mockPrisma.alertDelivery.createMany.mock.calls[0][0];
      expect(deliveryCall.data).toHaveLength(4);
      expect(deliveryCall.data.map((d: any) => d.channel)).toEqual([
        'in_app',
        'email',
        'push',
        'webhook',
      ]);
    });

    it('creates single delivery when only one channel is configured', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        makeLaunchRule({ channels: ['push'] }),
      ]);

      await processAlerts('launch_status', makeLaunchData(), mockPrisma);

      const deliveryCall = mockPrisma.alertDelivery.createMany.mock.calls[0][0];
      expect(deliveryCall.data).toHaveLength(1);
      expect(deliveryCall.data[0].channel).toBe('push');
    });
  });

  // ── Status change scenarios ────────────────────────────────────────────

  describe('launch status change scenarios', () => {
    const statuses = ['go', 'scrub', 'success', 'failure'];

    for (const status of statuses) {
      it(`triggers alert for status change to "${status}"`, async () => {
        mockPrisma.alertRule.findMany.mockResolvedValue([makeLaunchRule()]);

        const count = await processAlerts(
          'launch_status',
          makeLaunchData({ status }),
          mockPrisma
        );

        expect(count).toBe(1);

        const deliveryCall = mockPrisma.alertDelivery.createMany.mock.calls[0][0];
        expect(deliveryCall.data[0].message).toContain(`"${status}"`);
      });
    }
  });

  // ── Error resilience ───────────────────────────────────────────────────

  describe('error resilience', () => {
    it('returns 0 when findMany throws', async () => {
      mockPrisma.alertRule.findMany.mockRejectedValue(
        new Error('DB connection lost')
      );

      const count = await processAlerts(
        'launch_status',
        makeLaunchData(),
        mockPrisma
      );

      expect(count).toBe(0);
    });

    it('continues processing other rules when one rule throws', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([
        makeLaunchRule({ id: 'rule-1' }),
        makeLaunchRule({ id: 'rule-2', userId: 'user-2' }),
      ]);

      // First alertHistory.create throws, second succeeds
      mockPrisma.alertHistory.create
        .mockRejectedValueOnce(new Error('Write conflict'))
        .mockResolvedValueOnce({ id: 'history-2' });

      const count = await processAlerts(
        'launch_status',
        makeLaunchData(),
        mockPrisma
      );

      // Only the second rule's alert should have succeeded
      expect(count).toBe(1);
      expect(mockPrisma.alertHistory.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.alertDelivery.createMany).toHaveBeenCalledTimes(1);
    });
  });

  // ── Data passed through to delivery ────────────────────────────────────

  describe('data passthrough to deliveries', () => {
    it('includes all event data in the delivery payload', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([makeLaunchRule()]);

      const eventData = makeLaunchData({
        launchSiteId: 'ksc-39a',
        vehicleType: 'Falcon 9',
      });

      await processAlerts('launch_status', eventData, mockPrisma);

      const deliveryCall = mockPrisma.alertDelivery.createMany.mock.calls[0][0];
      const deliveryData = deliveryCall.data[0].data;
      expect(deliveryData.provider).toBe('SpaceX');
      expect(deliveryData.status).toBe('go');
      expect(deliveryData.missionName).toBe('Starlink Group 6-42');
      expect(deliveryData.launchSiteId).toBe('ksc-39a');
      expect(deliveryData.vehicleType).toBe('Falcon 9');
      expect(deliveryData.triggerType).toBe('launch_status');
      expect(deliveryData.priority).toBe('high');
    });
  });
});
