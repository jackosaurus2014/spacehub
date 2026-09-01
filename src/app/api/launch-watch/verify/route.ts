import { NextRequest, NextResponse } from 'next/server';
import { verifyLaunchWatch } from '@/lib/launch-watch';
import { escapeHtml } from '@/lib/errors';

export const dynamic = 'force-dynamic';

// Escaped on every interpolation (2026-09-01, H3): the label can carry a user-typed string and this page renders on the app origin.
function page(rawTitle: string, rawBody: string, status = 200) {
  const title = escapeHtml(rawTitle);
  const body = escapeHtml(rawBody);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title} | SpaceNexus</title><meta name="robots" content="noindex"><style>body{background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}main{max-width:520px;text-align:center;padding:2rem}h1{font-size:1.5rem;margin:0 0 .5rem;color:#fff}p{color:#94a3b8;margin:0 0 1.5rem;line-height:1.5}a{color:#22d3ee;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><main><h1>${title}</h1><p>${body}</p><a href="/mission-control">Open Mission Control →</a></main></body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  if (!/^[a-f0-9]{48}$/.test(token)) return page('That link is not valid', 'Check the link in your email, or set the alert up again.', 400);
  const r = await verifyLaunchWatch(token);
  if (!r.ok) return page('That link is not valid', 'It may have already been used. Set the alert up again if you still want it.', 404);
  return page('Alerts confirmed', `You will get an email a day before, an hour before, and when it flies for ${r.label}.`);
}
