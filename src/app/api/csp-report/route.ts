/**
 * POST /api/csp-report — Content-Security-Policy violation sink.
 *
 * Browsers send here via the policy's `report-uri` (body type
 * application/csp-report, one report wrapped in {"csp-report": …}) or via
 * `report-to` (application/reports+json, an array of {type, body, …}).
 *
 * Privacy + noise budget (docs/SECURITY_AUDIT_2026-09.md, "CSP"):
 *   - keep only the effective/violated directive, the blocked URI's ORIGIN,
 *     the document's PATH, the disposition and a coarse UA family;
 *   - drop script-sample, source-file, line/column, referrer and anything
 *     else (a sample can contain page content; a source file + line can
 *     fingerprint an extension);
 *   - dedupe `${directive}|${blockedOrigin}` for 60s in-process so a page
 *     with a broken third-party tag logs once per minute, not per visitor;
 *   - always 204 — the browser never retries and a bad body is not an error.
 *
 * Middleware: CSRF-exempt, 20 req/min/IP, Cache-Control: no-store.
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

import {
  MAX_BODY_BYTES,
  noContent,
  shouldLog,
  summarizeReport,
  extractReportBodies,
} from '@/lib/csp-report';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const declared = Number(req.headers.get('content-length') ?? 0);
    if (declared > MAX_BODY_BYTES) return noContent();
    const text = await req.text();
    if (!text || text.length > MAX_BODY_BYTES) return noContent();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return noContent();
    }

    const ua = req.headers.get('user-agent');
    const now = Date.now();
    for (const body of extractReportBodies(parsed)) {
      const summary = summarizeReport(body, ua);
      if (!summary || !shouldLog(summary, now)) continue;
      logger.warn('csp_violation', { tag: 'csp_violation', ...summary });
    }
  } catch {
    // Never surface an error to the browser for a telemetry beacon.
  }
  return noContent();
}
