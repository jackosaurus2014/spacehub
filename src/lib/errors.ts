import { NextResponse } from 'next/server';

/**
 * Standard error codes for API responses
 */
export const ErrorCodes = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string | string[]>;
  };
}

/**
 * Standard API success response structure
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, string | string[]>
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Validation error helper (400)
 */
export function validationError(
  message: string,
  details?: Record<string, string | string[]>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ErrorCodes.VALIDATION_ERROR, message, 400, details);
}

/**
 * Missing field error helper (400)
 */
export function missingFieldError(field: string): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCodes.MISSING_FIELD,
    `${field} is required`,
    400,
    { [field]: `${field} is required` }
  );
}

/**
 * Invalid format error helper (400)
 */
export function invalidFormatError(
  field: string,
  expected: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCodes.INVALID_FORMAT,
    `Invalid ${field} format`,
    400,
    { [field]: `Expected ${expected}` }
  );
}

/**
 * Unauthorized error helper (401)
 */
export function unauthorizedError(
  message: string = 'Authentication required'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ErrorCodes.UNAUTHORIZED, message, 401);
}

/**
 * Forbidden error helper (403)
 */
export function forbiddenError(
  message: string = 'You do not have permission to perform this action'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ErrorCodes.FORBIDDEN, message, 403);
}

/**
 * Not found error helper (404)
 */
export function notFoundError(
  resource: string = 'Resource'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCodes.NOT_FOUND,
    `${resource} not found`,
    404
  );
}

/**
 * Conflict error helper (409)
 */
export function conflictError(message: string): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ErrorCodes.CONFLICT, message, 409);
}

/**
 * Already exists error helper (409)
 */
export function alreadyExistsError(
  resource: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCodes.ALREADY_EXISTS,
    `${resource} already exists`,
    409
  );
}

/**
 * Rate limited error helper (429)
 */
export function rateLimitedError(
  retryAfter?: number
): NextResponse<ApiErrorResponse> {
  const response = createErrorResponse(
    ErrorCodes.RATE_LIMITED,
    'Too many requests. Please try again later.',
    429
  );

  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter));
  }

  return response;
}

/**
 * Internal server error helper (500)
 */
export function internalError(
  message: string = 'An unexpected error occurred'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ErrorCodes.INTERNAL_ERROR, message, 500);
}

/**
 * Database error helper (500)
 */
export function databaseError(
  message: string = 'Database operation failed'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ErrorCodes.DATABASE_ERROR, message, 500);
}

/**
 * External API error helper (500)
 */
export function externalApiError(
  service: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ErrorCodes.EXTERNAL_API_ERROR,
    `Failed to communicate with ${service}`,
    500
  );
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Constrain pagination limit to a maximum value
 */
export function constrainPagination(
  limit: number,
  maxLimit: number = 100
): number {
  return Math.min(Math.max(1, limit), maxLimit);
}

/**
 * Constrain offset to a non-negative value
 */
export function constrainOffset(offset: number): number {
  return Math.max(0, offset);
}
