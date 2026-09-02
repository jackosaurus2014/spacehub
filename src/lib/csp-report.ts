/**
 * CSP violation-report helpers (2026-09-01). Lives outside the route module
 * because Next.js route files may only export HTTP handlers and segment
 * config. See src/app/api/csp-report/route.ts for the sink itself.
 */
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';


export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_REPORTS_PER_REQUEST = 20;
export const DEDUPE_WINDOW_MS = 60 * 1000;

/** Exported for tests. Key → last-logged timestamp. */
export const recentViolations = new Map<string, number>();

export interface CspViolationSummary {
  directive: string;
  blockedOrigin: string;
  documentPath: string;
  disposition: 'enforce' | 'report' | 'unknown';
  uaFamily: string;
}

type Raw = Record<string, unknown>;

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Origin only — never the path or query of a blocked resource. */
export function blockedUriToOrigin(uri: string | undefined): string {
  if (!uri) return 'unknown';
  // CSP keyword sources: 'inline', 'eval', 'data', 'blob', 'self', 'wasm-eval'…
  if (!uri.includes(':') && !uri.includes('/')) return uri.slice(0, 32);
  try {
    const u = new URL(uri);
    if (u.protocol === 'data:' || u.protocol === 'blob:') return u.protocol;
    return u.origin === 'null' ? u.protocol : u.origin;
  } catch {
    return 'unparseable';
  }
}

/** Path only — never the query string (it can carry tokens) or fragment. */
export function documentUriToPath(uri: string | undefined): string {
  if (!uri) return 'unknown';
  try {
    const u = new URL(uri, 'https://spacenexus.us');
    return u.pathname.slice(0, 200);
  } catch {
    return 'unparseable';
  }
}

/** Coarse browser family — enough to spot "only Safari" without a fingerprint. */
export function uaFamily(ua: string | null | undefined): string {
  if (!ua) return 'unknown';
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua) ? '-mobile' : '';
  if (/Edg\//.test(ua)) return `edge${mobile}`;
  if (/OPR\//.test(ua)) return `opera${mobile}`;
  if (/Firefox\//.test(ua)) return `firefox${mobile}`;
  if (/Chrome\//.test(ua) || /CriOS\//.test(ua)) return `chrome${mobile}`;
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return `safari${mobile}`;
  if (/bot|crawl|spider/i.test(ua)) return 'bot';
  return `other${mobile}`;
}

function normalizeDisposition(v: unknown): CspViolationSummary['disposition'] {
  return v === 'enforce' || v === 'report' ? v : 'unknown';
}

/**
 * Reduce one raw report body (either wire shape) to the fields we keep.
 * report-uri bodies use kebab-case keys; Reporting-API bodies use camelCase.
 */
export function summarizeReport(body: Raw, ua: string | null | undefined): CspViolationSummary | null {
  const directive =
    str(body['effective-directive']) ??
    str(body.effectiveDirective) ??
    str(body['violated-directive']) ??
    str(body.violatedDirective);
  if (!directive) return null;
  const blocked = str(body['blocked-uri']) ?? str(body.blockedURL) ?? str(body.blockedURI);
  const doc = str(body['document-uri']) ?? str(body.documentURL) ?? str(body.documentURI);
  return {
    directive: directive.slice(0, 64),
    blockedOrigin: blockedUriToOrigin(blocked),
    documentPath: documentUriToPath(doc),
    disposition: normalizeDisposition(body.disposition),
    uaFamily: uaFamily(ua),
  };
}

/** Unwrap either wire format into a list of raw report bodies. */
export function extractReportBodies(parsed: unknown): Raw[] {
  if (Array.isArray(parsed)) {
    // application/reports+json: [{ type: 'csp-violation', body: {…} }, …]
    return parsed
      .filter((r): r is Raw => !!r && typeof r === 'object')
      .filter((r) => r.type === undefined || r.type === 'csp-violation')
      .map((r) => (r.body && typeof r.body === 'object' ? (r.body as Raw) : r))
      .slice(0, MAX_REPORTS_PER_REQUEST);
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Raw;
    // application/csp-report: { "csp-report": {…} }
    if (obj['csp-report'] && typeof obj['csp-report'] === 'object') return [obj['csp-report'] as Raw];
    return [obj];
  }
  return [];
}

export function shouldLog(summary: CspViolationSummary, now: number): boolean {
  const key = `${summary.directive}|${summary.blockedOrigin}`;
  const last = recentViolations.get(key);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return false;
  recentViolations.set(key, now);
  // Keep the map bounded: sweep stale keys once it grows past a few hundred.
  if (recentViolations.size > 500) {
    recentViolations.forEach((t, k) => {
      if (now - t >= DEDUPE_WINDOW_MS) recentViolations.delete(k);
    });
  }
  return true;
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

