import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecretOrAdmin } from '@/lib/api-auth';
import { buildMorningBrief } from '@/lib/morning-brief';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/morning-brief/preview — build today's SpaceNexus AM without
 * sending or touching the ledger (2026-09-12). For the founder's eyes: an
 * admin session or the cron secret. Costs one Sonnet call per hit.
 *
 *   ?format=html  → the rendered email as text/html
 *   (default)     → JSON { subject, preheader, gate, poolSize, issue, html }
 */
export async function GET(request: NextRequest) {
  const auth = await requireCronSecretOrAdmin(request);
  if (auth) return auth;

  const built = await buildMorningBrief(new Date());
  const format = request.nextUrl.searchParams.get('format');

  if (format === 'html') {
    if (!built.rendered) {
      return new NextResponse(`<pre>Gates failed:\n${built.gate.failures.join('\n')}</pre>`, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    return new NextResponse(built.rendered.html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  return NextResponse.json({
    subject: built.rendered?.subject ?? built.issue?.subject ?? null,
    preheader: built.rendered?.preheader ?? built.issue?.preheader ?? null,
    gate: built.gate,
    poolSize: built.poolSize,
    rankedSize: built.rankedSize,
    draftError: built.draftError,
    issue: built.issue,
    html: built.rendered?.html ?? null,
    plain: built.rendered?.plain ?? null,
  });
}
