/**
 * @jest-environment node
 */

/**
 * Unit tests for src/lib/reputation.ts
 *
 * Tests:
 *   - REPUTATION_LEVELS are correctly ordered by min threshold
 *   - REPUTATION_POINTS have expected values
 *   - getReputationLevel returns correct level for various scores
 *   - getReputationLevel handles edge cases (0, negative, very high)
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    forumThread: { count: jest.fn() },
    forumPost: { count: jest.fn() },
    threadVote: { count: jest.fn() },
    postVote: { count: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import {
  REPUTATION_POINTS,
  REPUTATION_LEVELS,
  getReputationLevel,
} from '@/lib/reputation';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('REPUTATION_POINTS', () => {
  it('has correct point value for THREAD_CREATED', () => {
    expect(REPUTATION_POINTS.THREAD_CREATED).toBe(5);
  });

  it('has correct point value for POST_CREATED', () => {
    expect(REPUTATION_POINTS.POST_CREATED).toBe(2);
  });

  it('has correct point value for UPVOTE_RECEIVED', () => {
    expect(REPUTATION_POINTS.UPVOTE_RECEIVED).toBe(10);
  });

  it('has correct negative point value for DOWNVOTE_RECEIVED', () => {
    expect(REPUTATION_POINTS.DOWNVOTE_RECEIVED).toBe(-2);
  });

  it('has correct point value for ACCEPTED_ANSWER', () => {
    expect(REPUTATION_POINTS.ACCEPTED_ANSWER).toBe(25);
  });

  it('has correct negative point value for ACCEPTED_ANSWER_REVOKED', () => {
    expect(REPUTATION_POINTS.ACCEPTED_ANSWER_REVOKED).toBe(-25);
  });

  it('ACCEPTED_ANSWER and ACCEPTED_ANSWER_REVOKED are symmetric', () => {
    expect(REPUTATION_POINTS.ACCEPTED_ANSWER + REPUTATION_POINTS.ACCEPTED_ANSWER_REVOKED).toBe(0);
  });
});

describe('REPUTATION_LEVELS', () => {
  it('has 6 levels defined', () => {
    expect(REPUTATION_LEVELS).toHaveLength(6);
  });

  it('levels are ordered by ascending min threshold', () => {
    for (let i = 1; i < REPUTATION_LEVELS.length; i++) {
      expect(REPUTATION_LEVELS[i].min).toBeGreaterThan(REPUTATION_LEVELS[i - 1].min);
    }
  });

  it('first level starts at 0', () => {
    expect(REPUTATION_LEVELS[0].min).toBe(0);
  });

  it('each level has label, color, badge, and min properties', () => {
    REPUTATION_LEVELS.forEach((level) => {
      expect(level).toHaveProperty('label');
      expect(level).toHaveProperty('color');
      expect(level).toHaveProperty('badge');
      expect(level).toHaveProperty('min');
      expect(typeof level.label).toBe('string');
      expect(typeof level.color).toBe('string');
      expect(typeof level.badge).toBe('string');
      expect(typeof level.min).toBe('number');
    });
  });

  it('has the expected level names in order', () => {
    const labels = REPUTATION_LEVELS.map((l) => l.label);
    expect(labels).toEqual([
      'Novice',
      'Contributor',
      'Active Member',
      'Expert',
      'Trusted',
      'Space Authority',
    ]);
  });

  it('has the expected thresholds', () => {
    const thresholds = REPUTATION_LEVELS.map((l) => l.min);
    expect(thresholds).toEqual([0, 50, 200, 500, 1000, 2500]);
  });
});

describe('getReputationLevel', () => {
  // Exact boundary tests
  it('returns Novice for score 0', () => {
    const level = getReputationLevel(0);
    expect(level.label).toBe('Novice');
    expect(level.min).toBe(0);
    expect(level.nextMin).toBe(50);
  });

  it('returns Novice for score 49 (just below Contributor)', () => {
    const level = getReputationLevel(49);
    expect(level.label).toBe('Novice');
    expect(level.nextMin).toBe(50);
  });

  it('returns Contributor at exactly 50', () => {
    const level = getReputationLevel(50);
    expect(level.label).toBe('Contributor');
    expect(level.min).toBe(50);
    expect(level.nextMin).toBe(200);
  });

  it('returns Active Member at exactly 200', () => {
    const level = getReputationLevel(200);
    expect(level.label).toBe('Active Member');
    expect(level.min).toBe(200);
    expect(level.nextMin).toBe(500);
  });

  it('returns Expert at exactly 500', () => {
    const level = getReputationLevel(500);
    expect(level.label).toBe('Expert');
    expect(level.min).toBe(500);
    expect(level.nextMin).toBe(1000);
  });

  it('returns Trusted at exactly 1000', () => {
    const level = getReputationLevel(1000);
    expect(level.label).toBe('Trusted');
    expect(level.min).toBe(1000);
    expect(level.nextMin).toBe(2500);
  });

  it('returns Space Authority at exactly 2500', () => {
    const level = getReputationLevel(2500);
    expect(level.label).toBe('Space Authority');
    expect(level.min).toBe(2500);
    expect(level.nextMin).toBeUndefined();
  });

  // Edge cases
  it('returns Novice for negative score', () => {
    const level = getReputationLevel(-10);
    expect(level.label).toBe('Novice');
    expect(level.min).toBe(0);
  });

  it('returns Space Authority for very high score', () => {
    const level = getReputationLevel(100000);
    expect(level.label).toBe('Space Authority');
    expect(level.nextMin).toBeUndefined();
  });

  it('returns Space Authority with no nextMin', () => {
    const level = getReputationLevel(5000);
    expect(level.nextMin).toBeUndefined();
  });

  // Mid-range tests
  it('returns Contributor for score 100 (between 50 and 200)', () => {
    const level = getReputationLevel(100);
    expect(level.label).toBe('Contributor');
  });

  it('returns Active Member for score 300 (between 200 and 500)', () => {
    const level = getReputationLevel(300);
    expect(level.label).toBe('Active Member');
  });

  it('returns Expert for score 750 (between 500 and 1000)', () => {
    const level = getReputationLevel(750);
    expect(level.label).toBe('Expert');
  });

  it('returns Trusted for score 1500 (between 1000 and 2500)', () => {
    const level = getReputationLevel(1500);
    expect(level.label).toBe('Trusted');
  });

  // Return structure tests
  it('includes color and badge in the returned object', () => {
    const level = getReputationLevel(250);
    expect(level.color).toBe('text-green-400');
    expect(level.badge).toBeTruthy();
    expect(typeof level.badge).toBe('string');
  });

  it('returns a complete ReputationLevel shape', () => {
    const level = getReputationLevel(55);
    expect(level).toEqual({
      label: 'Contributor',
      color: 'text-blue-400',
      badge: expect.any(String),
      min: 50,
      nextMin: 200,
    });
  });
});
