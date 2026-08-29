import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { unauthorizedError, forbiddenError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { fetchGA4LandingReturns } from '@/lib/growth-metrics';

// Per landing page: users and returning users over the last 30 days. The
// number the roadmap's week-3 reallocation is decided on.
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorizedError();
  if (!session.user.isAdmin) return forbiddenError();
  try {
    const rows = await fetchGA4LandingReturns();
    return NextResponse.json({ rows, generatedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('landing-returns failed', { error: msg });
    return NextResponse.json({ rows: [], error: msg }, { status: 502 });
  }
}
