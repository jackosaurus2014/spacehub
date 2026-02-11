// Mock the logger to silence output during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  CircuitBreaker,
  CircuitState,
  createCircuitBreaker,
  getCircuitBreakerStatus,
} from '../circuit-breaker';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// CircuitBreaker class — initial state
// ---------------------------------------------------------------------------
describe('CircuitBreaker — initial state', () => {
  it('starts in CLOSED state', () => {
    const cb = new CircuitBreaker({ name: 'test-init' });
    const status = cb.getStatus();
    expect(status.state).toBe(CircuitState.CLOSED);
    expect(status.failures).toBe(0);
    expect(status.lastFailure).toBeNull();
  });

  it('exposes the name via getStatus()', () => {
    const cb = new CircuitBreaker({ name: 'my-service' });
    expect(cb.getStatus().name).toBe('my-service');
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — CLOSED state behavior
// ---------------------------------------------------------------------------
describe('CircuitBreaker — CLOSED state', () => {
  it('allows execution and returns the result', async () => {
    const cb = new CircuitBreaker({ name: 'closed-ok' });
    const result = await cb.execute(() => Promise.resolve('success'));
    expect(result).toBe('success');
  });

  it('returns the function result, not the fallback, when the call succeeds', async () => {
    const cb = new CircuitBreaker({ name: 'closed-ok-fallback' });
    const result = await cb.execute(() => Promise.resolve('real'), 'fallback');
    expect(result).toBe('real');
  });

  it('increments failure count on error but stays CLOSED below threshold', async () => {
    const cb = new CircuitBreaker({ name: 'closed-fail', failureThreshold: 3 });

    // Two failures -- still under threshold of 3
    await cb.execute(() => Promise.reject(new Error('boom')), 'fb').catch(() => {});
    await cb.execute(() => Promise.reject(new Error('boom')), 'fb').catch(() => {});

    const status = cb.getStatus();
    expect(status.state).toBe(CircuitState.CLOSED);
    expect(status.failures).toBe(2);
  });

  it('rethrows the error when no fallback is provided', async () => {
    const cb = new CircuitBreaker({ name: 'closed-throw', failureThreshold: 5 });
    await expect(
      cb.execute(() => Promise.reject(new Error('original error')))
    ).rejects.toThrow('original error');
  });

  it('returns the fallback when the call fails and a fallback is provided', async () => {
    const cb = new CircuitBreaker({ name: 'closed-fb', failureThreshold: 5 });
    const result = await cb.execute(
      () => Promise.reject(new Error('fail')),
      'safe-value'
    );
    expect(result).toBe('safe-value');
  });

  it('resets failure count on success', async () => {
    const cb = new CircuitBreaker({ name: 'closed-reset', failureThreshold: 5 });

    // Rack up 3 failures
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('fail')), null);
    }
    expect(cb.getStatus().failures).toBe(3);

    // A successful call resets failures to 0
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getStatus().failures).toBe(0);
    expect(cb.getStatus().state).toBe(CircuitState.CLOSED);
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — transition to OPEN after N consecutive failures
// ---------------------------------------------------------------------------
describe('CircuitBreaker — opens after failureThreshold', () => {
  it('opens the circuit after exactly failureThreshold failures (default 5)', async () => {
    const cb = new CircuitBreaker({ name: 'open-default' });

    for (let i = 0; i < 5; i++) {
      await cb.execute(() => Promise.reject(new Error('fail')), 'fb');
    }

    expect(cb.getStatus().state).toBe(CircuitState.OPEN);
    expect(cb.getStatus().failures).toBe(5);
  });

  it('opens the circuit after a custom failureThreshold', async () => {
    const cb = new CircuitBreaker({ name: 'open-custom', failureThreshold: 2 });

    await cb.execute(() => Promise.reject(new Error('fail')), 'fb');
    expect(cb.getStatus().state).toBe(CircuitState.CLOSED);

    await cb.execute(() => Promise.reject(new Error('fail')), 'fb');
    expect(cb.getStatus().state).toBe(CircuitState.OPEN);
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — OPEN state behavior
// ---------------------------------------------------------------------------
describe('CircuitBreaker — OPEN state', () => {
  function openCircuit(cb: CircuitBreaker, threshold = 5) {
    const promises = [];
    for (let i = 0; i < threshold; i++) {
      promises.push(cb.execute(() => Promise.reject(new Error('fail')), 'fb'));
    }
    return Promise.all(promises);
  }

  it('returns fallback immediately without calling the function', async () => {
    const cb = new CircuitBreaker({ name: 'open-fb', failureThreshold: 2 });
    await openCircuit(cb, 2);

    const fn = jest.fn(() => Promise.resolve('should not run'));
    const result = await cb.execute(fn, 'fallback-value');

    expect(result).toBe('fallback-value');
    expect(fn).not.toHaveBeenCalled();
  });

  it('throws when OPEN and no fallback is provided', async () => {
    const cb = new CircuitBreaker({ name: 'open-throw', failureThreshold: 2 });
    await openCircuit(cb, 2);

    await expect(
      cb.execute(() => Promise.resolve('ignored'))
    ).rejects.toThrow('Circuit breaker "open-throw" is OPEN');
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — HALF_OPEN transition after resetTimeout
// ---------------------------------------------------------------------------
describe('CircuitBreaker — HALF_OPEN transition', () => {
  async function openCircuit(
    cb: CircuitBreaker,
    threshold: number
  ): Promise<void> {
    for (let i = 0; i < threshold; i++) {
      await cb.execute(() => Promise.reject(new Error('fail')), 'fb');
    }
  }

  it('transitions from OPEN to HALF_OPEN after resetTimeout elapses', async () => {
    const cb = new CircuitBreaker({
      name: 'half-open-transition',
      failureThreshold: 2,
      resetTimeout: 10_000,
    });
    await openCircuit(cb, 2);
    expect(cb.getStatus().state).toBe(CircuitState.OPEN);

    // Advance time past the resetTimeout
    jest.advanceTimersByTime(10_001);

    // getStatus() eagerly transitions
    expect(cb.getStatus().state).toBe(CircuitState.HALF_OPEN);
  });

  it('does NOT transition if resetTimeout has not fully elapsed', async () => {
    const cb = new CircuitBreaker({
      name: 'half-open-too-early',
      failureThreshold: 2,
      resetTimeout: 10_000,
    });
    await openCircuit(cb, 2);

    jest.advanceTimersByTime(9_999);
    expect(cb.getStatus().state).toBe(CircuitState.OPEN);
  });

  it('closes the circuit on success in HALF_OPEN state', async () => {
    const cb = new CircuitBreaker({
      name: 'half-open-success',
      failureThreshold: 2,
      resetTimeout: 5_000,
    });
    await openCircuit(cb, 2);

    // Move past resetTimeout so the next execute() transitions to HALF_OPEN
    jest.advanceTimersByTime(5_001);

    // Successful probe request should close the circuit
    const result = await cb.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(cb.getStatus().state).toBe(CircuitState.CLOSED);
    expect(cb.getStatus().failures).toBe(0);
  });

  it('re-opens the circuit on failure in HALF_OPEN state', async () => {
    const cb = new CircuitBreaker({
      name: 'half-open-fail',
      failureThreshold: 2,
      resetTimeout: 5_000,
    });
    await openCircuit(cb, 2);

    jest.advanceTimersByTime(5_001);

    // Probe request fails -- should go back to OPEN
    const result = await cb.execute(
      () => Promise.reject(new Error('still broken')),
      'fallback'
    );
    expect(result).toBe('fallback');
    expect(cb.getStatus().state).toBe(CircuitState.OPEN);
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — getStatus()
// ---------------------------------------------------------------------------
describe('CircuitBreaker — getStatus()', () => {
  it('returns correct fields after initialization', () => {
    const cb = new CircuitBreaker({ name: 'status-init' });
    const status = cb.getStatus();

    expect(status).toEqual({
      name: 'status-init',
      state: CircuitState.CLOSED,
      failures: 0,
      lastFailure: null,
    });
  });

  it('returns correct fields after failures', async () => {
    const cb = new CircuitBreaker({ name: 'status-fail', failureThreshold: 5 });

    const now = Date.now();
    await cb.execute(() => Promise.reject(new Error('err')), 'fb');

    const status = cb.getStatus();
    expect(status.failures).toBe(1);
    expect(status.state).toBe(CircuitState.CLOSED);
    expect(status.lastFailure).not.toBeNull();
    // lastFailure should be a valid ISO date string near "now"
    const failureDate = new Date(status.lastFailure!).getTime();
    expect(failureDate).toBeGreaterThanOrEqual(now);
  });

  it('eagerly transitions to HALF_OPEN when queried after resetTimeout', async () => {
    const cb = new CircuitBreaker({
      name: 'status-eager',
      failureThreshold: 1,
      resetTimeout: 3_000,
    });
    await cb.execute(() => Promise.reject(new Error('fail')), 'fb');
    expect(cb.getStatus().state).toBe(CircuitState.OPEN);

    jest.advanceTimersByTime(3_000);

    // getStatus() should eagerly flip to HALF_OPEN even without an execute() call
    expect(cb.getStatus().state).toBe(CircuitState.HALF_OPEN);
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — reset()
// ---------------------------------------------------------------------------
describe('CircuitBreaker — reset()', () => {
  it('manually resets the circuit to CLOSED with zero failures', async () => {
    const cb = new CircuitBreaker({ name: 'manual-reset', failureThreshold: 2 });

    // Drive it to OPEN
    await cb.execute(() => Promise.reject(new Error('fail')), 'fb');
    await cb.execute(() => Promise.reject(new Error('fail')), 'fb');
    expect(cb.getStatus().state).toBe(CircuitState.OPEN);

    cb.reset();

    expect(cb.getStatus().state).toBe(CircuitState.CLOSED);
    expect(cb.getStatus().failures).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// createCircuitBreaker factory
// ---------------------------------------------------------------------------
describe('createCircuitBreaker — factory and registry', () => {
  // We need to clear the internal registry between tests. The only way is to
  // ensure we use unique names per test so they don't clash. The registry is
  // module-level and not exported, so we can't clear it directly.

  it('creates a CircuitBreaker and registers it', () => {
    const cb = createCircuitBreaker('factory-test-1');
    expect(cb).toBeInstanceOf(CircuitBreaker);
    expect(cb.name).toBe('factory-test-1');

    // It should appear in the global status
    const statuses = getCircuitBreakerStatus();
    const entry = statuses.find((s) => s.name === 'factory-test-1');
    expect(entry).toBeDefined();
    expect(entry!.state).toBe(CircuitState.CLOSED);
  });

  it('returns the same instance for the same name (idempotent)', () => {
    const cb1 = createCircuitBreaker('factory-test-2');
    const cb2 = createCircuitBreaker('factory-test-2');
    expect(cb1).toBe(cb2);
  });

  it('passes custom options to the underlying CircuitBreaker', async () => {
    const cb = createCircuitBreaker('factory-test-3', {
      failureThreshold: 1,
      resetTimeout: 2_000,
    });

    // One failure should open it
    await cb.execute(() => Promise.reject(new Error('fail')), 'fb');
    expect(cb.getStatus().state).toBe(CircuitState.OPEN);
  });
});

// ---------------------------------------------------------------------------
// getCircuitBreakerStatus — global status
// ---------------------------------------------------------------------------
describe('getCircuitBreakerStatus', () => {
  it('returns statuses of all registered breakers', () => {
    // These were created in earlier tests; at minimum they should be present
    const statuses = getCircuitBreakerStatus();
    expect(Array.isArray(statuses)).toBe(true);
    expect(statuses.length).toBeGreaterThan(0);

    // Every entry should have the required shape
    for (const s of statuses) {
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('state');
      expect(s).toHaveProperty('failures');
      expect(s).toHaveProperty('lastFailure');
    }
  });

  it('reflects the current state of each breaker', async () => {
    const cb = createCircuitBreaker('factory-test-status', {
      failureThreshold: 1,
    });
    await cb.execute(() => Promise.reject(new Error('fail')), 'fb');

    const statuses = getCircuitBreakerStatus();
    const entry = statuses.find((s) => s.name === 'factory-test-status');
    expect(entry).toBeDefined();
    expect(entry!.state).toBe(CircuitState.OPEN);
    expect(entry!.failures).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// CircuitBreaker — full degradation lifecycle
// ---------------------------------------------------------------------------
describe('CircuitBreaker — full lifecycle', () => {
  it('CLOSED -> OPEN -> HALF_OPEN -> CLOSED on recovery', async () => {
    const cb = new CircuitBreaker({
      name: 'lifecycle',
      failureThreshold: 3,
      resetTimeout: 10_000,
    });

    // 1. Starts CLOSED
    expect(cb.getStatus().state).toBe(CircuitState.CLOSED);

    // 2. 3 consecutive failures trip it to OPEN
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('down')), 'fb');
    }
    expect(cb.getStatus().state).toBe(CircuitState.OPEN);

    // 3. After resetTimeout, transitions to HALF_OPEN
    jest.advanceTimersByTime(10_001);
    expect(cb.getStatus().state).toBe(CircuitState.HALF_OPEN);

    // 4. Successful probe closes the circuit
    const result = await cb.execute(() => Promise.resolve('back!'));
    expect(result).toBe('back!');
    expect(cb.getStatus().state).toBe(CircuitState.CLOSED);
    expect(cb.getStatus().failures).toBe(0);
  });

  it('CLOSED -> OPEN -> HALF_OPEN -> OPEN on continued failure', async () => {
    const cb = new CircuitBreaker({
      name: 'lifecycle-fail',
      failureThreshold: 2,
      resetTimeout: 5_000,
    });

    // Trip to OPEN
    for (let i = 0; i < 2; i++) {
      await cb.execute(() => Promise.reject(new Error('down')), 'fb');
    }
    expect(cb.getStatus().state).toBe(CircuitState.OPEN);

    // Wait for HALF_OPEN
    jest.advanceTimersByTime(5_001);

    // Probe fails -- back to OPEN
    await cb.execute(() => Promise.reject(new Error('still down')), 'fb');
    expect(cb.getStatus().state).toBe(CircuitState.OPEN);

    // Wait again for HALF_OPEN
    jest.advanceTimersByTime(5_001);
    expect(cb.getStatus().state).toBe(CircuitState.HALF_OPEN);

    // This time the probe succeeds
    await cb.execute(() => Promise.resolve('recovered'));
    expect(cb.getStatus().state).toBe(CircuitState.CLOSED);
  });
});
