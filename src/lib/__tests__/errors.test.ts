/**
 * @jest-environment node
 */
import {
  validationError,
  missingFieldError,
  invalidFormatError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  alreadyExistsError,
  rateLimitedError,
  internalError,
  databaseError,
  externalApiError,
  createSuccessResponse,
  safeJsonParse,
  constrainPagination,
  constrainOffset,
  ErrorCodes,
} from '../errors';

// ---------------------------------------------------------------------------
// validationError
// ---------------------------------------------------------------------------
describe('validationError', () => {
  it('returns status 400 with VALIDATION_ERROR code', async () => {
    const response = validationError('Invalid input');
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(body.error.message).toBe('Invalid input');
  });

  it('includes details when provided', async () => {
    const response = validationError('Validation failed', {
      field: ['err'],
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.details).toEqual({ field: ['err'] });
  });
});

// ---------------------------------------------------------------------------
// missingFieldError
// ---------------------------------------------------------------------------
describe('missingFieldError', () => {
  it('returns status 400 with message containing the field name', async () => {
    const response = missingFieldError('email');
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.MISSING_FIELD);
    expect(body.error.message).toContain('email');
  });
});

// ---------------------------------------------------------------------------
// invalidFormatError
// ---------------------------------------------------------------------------
describe('invalidFormatError', () => {
  it('returns status 400 with INVALID_FORMAT code', async () => {
    const response = invalidFormatError('date', 'ISO 8601');
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.INVALID_FORMAT);
    expect(body.error.message).toContain('date');
    expect(body.error.details).toHaveProperty('date');
  });
});

// ---------------------------------------------------------------------------
// unauthorizedError
// ---------------------------------------------------------------------------
describe('unauthorizedError', () => {
  it('returns status 401', async () => {
    const response = unauthorizedError();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.UNAUTHORIZED);
  });
});

// ---------------------------------------------------------------------------
// forbiddenError
// ---------------------------------------------------------------------------
describe('forbiddenError', () => {
  it('returns status 403', async () => {
    const response = forbiddenError();
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.FORBIDDEN);
  });
});

// ---------------------------------------------------------------------------
// notFoundError
// ---------------------------------------------------------------------------
describe('notFoundError', () => {
  it('returns status 404 with message containing the resource name', async () => {
    const response = notFoundError('User');
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.NOT_FOUND);
    expect(body.error.message).toContain('User');
  });
});

// ---------------------------------------------------------------------------
// conflictError
// ---------------------------------------------------------------------------
describe('conflictError', () => {
  it('returns status 409', async () => {
    const response = conflictError('Resource conflict');
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.CONFLICT);
    expect(body.error.message).toBe('Resource conflict');
  });
});

// ---------------------------------------------------------------------------
// alreadyExistsError
// ---------------------------------------------------------------------------
describe('alreadyExistsError', () => {
  it('returns status 409 with ALREADY_EXISTS code', async () => {
    const response = alreadyExistsError('User');
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.ALREADY_EXISTS);
    expect(body.error.message).toContain('User');
  });
});

// ---------------------------------------------------------------------------
// rateLimitedError
// ---------------------------------------------------------------------------
describe('rateLimitedError', () => {
  it('returns status 429 with Retry-After header when retryAfter is given', async () => {
    const response = rateLimitedError(60);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.RATE_LIMITED);
  });

  it('returns status 429 without Retry-After header when no retryAfter', async () => {
    const response = rateLimitedError();
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeNull();
    const body = await response.json();
    expect(body.error.code).toBe(ErrorCodes.RATE_LIMITED);
  });
});

// ---------------------------------------------------------------------------
// internalError
// ---------------------------------------------------------------------------
describe('internalError', () => {
  it('returns status 500 with INTERNAL_ERROR code', async () => {
    const response = internalError();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
  });
});

// ---------------------------------------------------------------------------
// databaseError
// ---------------------------------------------------------------------------
describe('databaseError', () => {
  it('returns status 500 with DATABASE_ERROR code', async () => {
    const response = databaseError();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.DATABASE_ERROR);
  });
});

// ---------------------------------------------------------------------------
// externalApiError
// ---------------------------------------------------------------------------
describe('externalApiError', () => {
  it('returns status 500 with message containing the service name', async () => {
    const response = externalApiError('NASA');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCodes.EXTERNAL_API_ERROR);
    expect(body.error.message).toContain('NASA');
  });
});

// ---------------------------------------------------------------------------
// createSuccessResponse
// ---------------------------------------------------------------------------
describe('createSuccessResponse', () => {
  it('returns status 200 with success: true by default', async () => {
    const response = createSuccessResponse({ id: '123' });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: '123' });
  });

  it('returns a custom status code when provided', async () => {
    const response = createSuccessResponse({ id: '123' }, 201);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: '123' });
  });
});

// ---------------------------------------------------------------------------
// safeJsonParse
// ---------------------------------------------------------------------------
describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    const result = safeJsonParse('{"a":1}', {});
    expect(result).toEqual({ a: 1 });
  });

  it('returns fallback for invalid JSON', () => {
    const result = safeJsonParse('invalid', { default: true });
    expect(result).toEqual({ default: true });
  });
});

// ---------------------------------------------------------------------------
// constrainPagination
// ---------------------------------------------------------------------------
describe('constrainPagination', () => {
  it('caps limit at the default max of 100', () => {
    expect(constrainPagination(200)).toBe(100);
  });

  it('clamps 0 to 1', () => {
    expect(constrainPagination(0)).toBe(1);
  });

  it('clamps negative to 1', () => {
    expect(constrainPagination(-5)).toBe(1);
  });

  it('leaves a valid limit unchanged', () => {
    expect(constrainPagination(50)).toBe(50);
  });

  it('uses a custom max limit when provided', () => {
    expect(constrainPagination(200, 500)).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// constrainOffset
// ---------------------------------------------------------------------------
describe('constrainOffset', () => {
  it('clamps negative offset to 0', () => {
    expect(constrainOffset(-5)).toBe(0);
  });

  it('leaves a valid offset unchanged', () => {
    expect(constrainOffset(10)).toBe(10);
  });
});
