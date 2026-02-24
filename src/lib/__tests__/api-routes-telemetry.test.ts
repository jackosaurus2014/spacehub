/**
 * @jest-environment node
 */

// Mock the logger before any imports that use it
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { POST } from '@/app/api/telemetry/route';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// POST /api/telemetry
// ---------------------------------------------------------------------------
describe('POST /api/telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Success responses ----

  it('returns 204 for valid error event', async () => {
    const req = makeRequest({
      level: 'error',
      message: 'Test error',
      url: 'https://example.com',
      userAgent: 'TestAgent',
    });
    const res = await POST(req);
    expect(res.status).toBe(204);
  });

  it('returns 204 for valid warn event', async () => {
    const req = makeRequest({ level: 'warn', message: 'Test warning' });
    const res = await POST(req);
    expect(res.status).toBe(204);
  });

  it('returns 204 for valid info event', async () => {
    const req = makeRequest({ level: 'info', message: 'Test info' });
    const res = await POST(req);
    expect(res.status).toBe(204);
  });

  // ---- Logger routing ----

  it('logs error-level events via logger.error', async () => {
    const req = makeRequest({ level: 'error', message: 'Test error' });
    await POST(req);
    expect(logger.error).toHaveBeenCalledWith(
      '[Client] Test error',
      expect.objectContaining({ source: 'client-telemetry' }),
    );
  });

  it('logs warn-level events via logger.warn', async () => {
    const req = makeRequest({ level: 'warn', message: 'Test warning' });
    await POST(req);
    expect(logger.warn).toHaveBeenCalledWith(
      '[Client] Test warning',
      expect.objectContaining({ source: 'client-telemetry' }),
    );
  });

  it('logs info-level events via logger.info', async () => {
    const req = makeRequest({ level: 'info', message: 'Test info' });
    await POST(req);
    expect(logger.info).toHaveBeenCalledWith(
      '[Client] Test info',
      expect.objectContaining({ source: 'client-telemetry' }),
    );
  });

  it('includes source: client-telemetry in log context', async () => {
    const req = makeRequest({ level: 'error', message: 'context check' });
    await POST(req);
    const logContext = (logger.error as jest.Mock).mock.calls[0][1];
    expect(logContext).toHaveProperty('source', 'client-telemetry');
  });

  // ---- Validation failures ----

  it('returns 400 for invalid level', async () => {
    const req = makeRequest({ level: 'critical', message: 'test' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing message', async () => {
    const req = makeRequest({ level: 'error' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for message over 500 chars', async () => {
    const req = makeRequest({ level: 'error', message: 'x'.repeat(501) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ---- Graceful degradation ----

  it('returns 204 for malformed JSON (graceful degradation)', async () => {
    const req = new NextRequest('http://localhost/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json',
    });
    const res = await POST(req);
    expect(res.status).toBe(204);
  });
});
