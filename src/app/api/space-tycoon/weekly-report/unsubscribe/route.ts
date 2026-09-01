import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyUnsubscribeToken } from '@/lib/game/weekly-report-email';

export const dynamic = 'force-dynamic';

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title} | SpaceNexus</title><meta name="robots" content="noindex"><style>body{background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}main{max-width:520px;text-align:center;padding:2rem}h1{font-size:1.5rem;margin:0 0 .5rem;color:#fff}p{color:#94a3b8;margin:0 0 1.5rem;line-height:1.5}a{color:#22d3ee;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><main><h1>${title}</h1><p>${body}</p><a href="/space-tycoon">Back to Space Tycoon →</a></main></body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// One-click opt-out for the Space Tycoon weekly report. The token is an HMAC
// of the profile id signed with CRON_SECRET (src/lib/game/weekly-report-email.ts)
// — no stored token, no new table. GET for email links, POST for
// List-Unsubscribe-Post style clients.
async function handle(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const profileId = verifyUnsubscribeToken(token);
  if (!profileId) return page('That link is not valid', 'Check the link in your email, or turn the weekly report off from the Reports tab in Space Tycoon.', 400);
  try {
    const r = await prisma.gameProfile.updateMany({ where: { id: profileId, weeklyReportEmail: true }, data: { weeklyReportEmail: false } });
    if (r.count === 0) return page('Already off', 'Weekly reports were already turned off for this corporation.');
    return page('Weekly reports stopped', 'You can turn them back on any time from the Reports tab in Space Tycoon.');
  } catch (err) {
    logger.error('weekly-report unsubscribe failed', { error: err instanceof Error ? err.message : String(err) });
    return page('Something went wrong', 'Please try the link again in a moment.', 500);
  }
}
export const GET = handle;
export const POST = handle;
