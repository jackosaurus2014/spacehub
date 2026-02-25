/**
 * @jest-environment node
 */

// ---------------------------------------------------------------------------
// Section 1: buildTsQuery edge cases
// ---------------------------------------------------------------------------
import { buildTsQuery } from '@/lib/full-text-search';

describe('buildTsQuery edge cases', () => {
  it('returns empty string for only special characters', () => {
    expect(buildTsQuery('!@#$%')).toBe('');
  });

  it('returns empty string for only whitespace', () => {
    expect(buildTsQuery('   ')).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(buildTsQuery('')).toBe('');
  });

  it('filters out words that become empty after sanitization', () => {
    expect(buildTsQuery('hello !@# world')).toBe('hello:* & world:*');
  });

  it('handles single valid word with special chars', () => {
    expect(buildTsQuery('***valid')).toBe('valid:*');
  });

  it('handles normal multi-word query', () => {
    expect(buildTsQuery('space launch')).toBe('space:* & launch:*');
  });

  it('handles single word', () => {
    expect(buildTsQuery('satellite')).toBe('satellite:*');
  });
});

// ---------------------------------------------------------------------------
// Section 2: Telemetry payload size limit
// ---------------------------------------------------------------------------
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { POST } from '@/app/api/telemetry/route';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

describe('Telemetry payload size limit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects payload with Content-Length > 5120', async () => {
    const req = new NextRequest('http://localhost/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '10000' },
      body: JSON.stringify({ level: 'info', message: 'test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('accepts payload with Content-Length <= 5120', async () => {
    const req = new NextRequest('http://localhost/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '100' },
      body: JSON.stringify({ level: 'info', message: 'test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(logger.info).toHaveBeenCalled();
  });

  it('accepts payload without Content-Length header', async () => {
    const req = new NextRequest('http://localhost/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info', message: 'test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(logger.info).toHaveBeenCalled();
  });
});
