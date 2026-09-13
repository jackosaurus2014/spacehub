/**
 * @jest-environment node
 */
/**
 * /api/salaries/[company]/exists — the probe behind middleware's real-404
 * for /salaries/[company] (2026-09-13). Contract (see
 * api-routes-exists-checks.test.ts): 404 exactly when the page would
 * notFound(), 200 when it renders, 200 on any internal error.
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/salaries-by-company', () => ({
  resolveSalaryCompany: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { resolveSalaryCompany } from '@/lib/salaries-by-company';
import { GET } from '@/app/api/salaries/[company]/exists/route';

const resolve = resolveSalaryCompany as jest.Mock;
const req = () => new NextRequest('https://spacenexus.us/api/salaries/x/exists');
const call = (company: string) => GET(req(), { params: Promise.resolve({ company }) });

beforeEach(() => jest.clearAllMocks());

describe('salaries exists', () => {
  it('404s an unknown or under-threshold company', async () => {
    resolve.mockResolvedValue(null);
    const res = await call('nobody');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ exists: false });
    expect(resolve).toHaveBeenCalledWith('nobody');
  });

  it('404s an empty or absurd slug without touching the resolver', async () => {
    expect((await call('')).status).toBe(404);
    expect((await call('x'.repeat(201))).status).toBe(404);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('200s an eligible company', async () => {
    resolve.mockResolvedValue({ name: 'Blue Origin', slug: 'blue-origin', activeCount: 5, remoteCount: 0 });
    const res = await call('blue-origin');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ exists: true });
  });

  it('fails open on a resolver error', async () => {
    resolve.mockRejectedValue(new Error('db down'));
    const res = await call('blue-origin');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ exists: true, error: true });
  });
});
