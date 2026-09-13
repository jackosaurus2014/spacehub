/**
 * POST /api/qa/report (2026-09-12) — the nightly probes (GitHub Actions
 * `.github/workflows/nightly-qa.yml`, scripts in scripts/qa/) post their
 * results here. Auth: `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Every run is recorded in DataRefreshLog (module qa-smoke / qa-tycoon /
 * qa-phone, refreshType 'nightly-probe') so the content-accuracy sentinel can
 * tell when a probe stopped running at all. A failed run emails the alerts
 * inbox (alertEmail(): ALERT_EMAIL -> ADMIN_EMAIL) with the failing checks;
 * the details JSON is kept on the log row.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireCronSecret, validationError, internalError } from '@/lib/errors';
import { alertEmail } from '@/lib/notify-routing';
import { logger } from '@/lib/logger';
import { QA_REPORT_MODULES } from '@/lib/qa-accounts';

export const dynamic = 'force-dynamic';

const checkSchema = z.object({
  id: z.string().min(1).max(120),
  ok: z.boolean(),
  detail: z.string().max(2000).optional().default(''),
});

const reportSchema = z.object({
  module: z.enum(QA_REPORT_MODULES),
  status: z.enum(['success', 'partial', 'failed']),
  durationMs: z.number().int().nonnegative().optional(),
  runUrl: z.string().url().max(500).optional(),
  checks: z.array(checkSchema).max(400),
});

export type QaReportBody = z.infer<typeof reportSchema>;

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] || c);
}

async function emailFailure(body: QaReportBody, failed: QaReportBody['checks']): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <alerts@spacenexus.us>';
    const rows = failed
      .map((c) => '<li><strong>' + escapeHtml(c.id) + '</strong>' + (c.detail ? ' - ' + escapeHtml(c.detail) : '') + '</li>')
      .join('');
    const took = body.durationMs ? ' (run took ' + Math.round(body.durationMs / 1000) + 's)' : '';
    const runLink = body.runUrl ? '<p><a href="' + escapeHtml(body.runUrl) + '">Workflow run</a></p>' : '';
    await resend.emails.send({
      from: fromEmail,
      to: alertEmail(),
      subject: '[SpaceNexus] Nightly QA ' + body.status + ': ' + body.module + ' (' + failed.length + ' failing)',
      html:
        '<h2>Nightly QA - ' + escapeHtml(body.module) + ' ' + escapeHtml(body.status) + '</h2>' +
        '<p>' + failed.length + ' of ' + body.checks.length + ' checks failed' + took + '.</p>' +
        '<ul>' + rows + '</ul>' + runLink +
        '<p style="color:#666;font-size:12px">Automated alert from the SpaceNexus nightly QA probes (scripts/qa/). Severity: ' +
        (body.status === 'failed' ? 'critical' : 'warning') + '.</p>',
    });
    return true;
  } catch (err) {
    logger.warn('QA report: failed to send alert email', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rejection = requireCronSecret(request);
  if (rejection) return rejection;
  try {
    const parsed = reportSchema.safeParse(await request.json());
    if (!parsed.success) return validationError('Invalid QA report', { issues: parsed.error.issues.map((i) => i.path.join('.') + ': ' + i.message) });
    const body = parsed.data;
    const failed = body.checks.filter((c) => !c.ok);
    const derivedStatus = failed.length === 0 ? 'success' : body.status === 'success' ? 'partial' : body.status;

    await prisma.dataRefreshLog.create({
      data: {
        module: body.module,
        refreshType: 'nightly-probe',
        status: derivedStatus,
        itemsChecked: body.checks.length,
        itemsUpdated: body.checks.length - failed.length,
        duration: body.durationMs ?? null,
        errorMessage: failed.length ? failed.map((c) => c.id + ': ' + c.detail).join('\n').slice(0, 8000) : null,
        details: JSON.stringify({ runUrl: body.runUrl ?? null, checks: body.checks }).slice(0, 200_000),
      },
    });

    let emailed = false;
    if (failed.length > 0) emailed = await emailFailure({ ...body, status: derivedStatus }, failed);
    logger.info('QA report recorded', { module: body.module, status: derivedStatus, failed: failed.length, emailed });
    return NextResponse.json({ ok: true, status: derivedStatus, failed: failed.length, emailed });
  } catch (err) {
    logger.error('QA report failed', { error: err instanceof Error ? err.message : String(err) });
    return internalError('Could not record the QA report');
  }
}
