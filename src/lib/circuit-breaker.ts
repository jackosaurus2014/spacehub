/**
 * Circuit Breaker pattern implementation for external API calls.
 *
 * Three states:
 *   CLOSED  - Normal operation; requests pass through.
 *   OPEN    - Failures exceeded threshold; requests are blocked and fallback is returned.
 *   HALF_OPEN - After resetTimeout, one probe request is allowed through to test recovery.
 *
 * Server-side only (Node.js). No external dependencies.
 */

import { logger } from '@/lib/logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** Milliseconds to keep the circuit open before transitioning to HALF_OPEN. Default: 60000 (1 min) */
  resetTimeout?: number;
  /** Human-readable name used for logging and status reporting. */
  name: string;
}

export interface CircuitBreakerStatus {
  name: string;
  state: CircuitState;
  failures: number;
  lastFailure: string | null;
}

/** Registry of all circuit breakers created through the factory. */
const registry: Map<string, CircuitBreaker> = new Map();

export class CircuitBreaker {
  readonly name: string;
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number | null = null;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 60_000;
  }

  /**
   * Execute an async function through the circuit breaker.
   *
   * - CLOSED: the function runs normally. Failures increment the counter; when
   *   the counter reaches `failureThreshold` the circuit opens.
   * - OPEN: if `resetTimeout` has elapsed the state moves to HALF_OPEN and a
   *   single probe request is allowed. Otherwise the `fallback` value is
   *   returned immediately (or the error is rethrown if no fallback is provided).
   * - HALF_OPEN: one request is allowed through. Success resets the circuit to
   *   CLOSED; failure reopens it.
   */
  async execute<T>(fn: () => Promise<T>, fallback?: T): Promise<T> {
    // --- OPEN state handling ---
    if (this.state === CircuitState.OPEN) {
      // Check whether enough time has passed to probe
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        logger.info(`CircuitBreaker:${this.name} transitioning to HALF_OPEN — allowing probe request`);
      } else {
        logger.info(`CircuitBreaker:${this.name} circuit is OPEN — returning fallback`);
        if (fallback !== undefined) {
          return fallback;
        }
        throw new Error(`Circuit breaker "${this.name}" is OPEN — call rejected`);
      }
    }

    // --- CLOSED or HALF_OPEN: attempt the call ---
    try {
      const result = await fn();

      // Success: reset to CLOSED
      if (this.state === CircuitState.HALF_OPEN) {
        logger.info(`CircuitBreaker:${this.name} probe succeeded — circuit CLOSED`);
      }
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();

      // In HALF_OPEN, a single failure reopens immediately
      if (this.state === CircuitState.HALF_OPEN) {
        this.trip();
      }

      // In CLOSED, check if threshold has been reached
      if (this.failures >= this.failureThreshold) {
        this.trip();
      }

      // Return fallback when available, otherwise rethrow
      if (fallback !== undefined) {
        logger.warn(`CircuitBreaker:${this.name} call failed — returning fallback`, { failures: this.failures, threshold: this.failureThreshold, error: error instanceof Error ? error.message : String(error) });
        return fallback;
      }

      throw error;
    }
  }

  /** Return the current status of this circuit breaker. */
  getStatus(): CircuitBreakerStatus {
    // Auto-transition to HALF_OPEN for status reporting accuracy
    if (
      this.state === CircuitState.OPEN &&
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime >= this.resetTimeout
    ) {
      this.state = CircuitState.HALF_OPEN;
    }

    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
    };
  }

  /** Manually reset the circuit breaker to CLOSED with zero failures. */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
  }

  // ---- private helpers ----

  private recordFailure(): void {
    this.failures += 1;
    this.lastFailureTime = Date.now();
  }

  private trip(): void {
    this.state = CircuitState.OPEN;
    logger.warn(`CircuitBreaker:${this.name} circuit OPENED`, { failures: this.failures, resetTimeoutMs: this.resetTimeout });
  }
}

// ---------------------------------------------------------------------------
// Factory & global status helpers
// ---------------------------------------------------------------------------

/**
 * Create (and register) a circuit breaker.
 *
 * If a breaker with the same name already exists it will be returned instead of
 * creating a duplicate. This makes it safe to call at module scope in files that
 * may be hot-reloaded.
 */
export function createCircuitBreaker(
  name: string,
  options?: Omit<CircuitBreakerOptions, 'name'>
): CircuitBreaker {
  const existing = registry.get(name);
  if (existing) {
    return existing;
  }

  const breaker = new CircuitBreaker({ name, ...options });
  registry.set(name, breaker);
  return breaker;
}

/**
 * Return the status of every registered circuit breaker.
 * Useful for health-check / status endpoints.
 */
export function getCircuitBreakerStatus(): CircuitBreakerStatus[] {
  const statuses: CircuitBreakerStatus[] = [];
  registry.forEach((breaker) => {
    statuses.push(breaker.getStatus());
  });
  return statuses;
}
