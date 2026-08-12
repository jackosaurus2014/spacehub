import { NextResponse } from 'next/server';
import { isGoogleAuthEnabled, isMicrosoftAuthEnabled } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/providers-available
 *
 * Reports which OAuth sign-in providers are configured (via env vars) so
 * client UIs can conditionally render provider buttons without leaking
 * any secrets. Returns only booleans.
 */
export async function GET() {
  return NextResponse.json({
    google: isGoogleAuthEnabled(),
    microsoft: isMicrosoftAuthEnabled(),
  });
}
