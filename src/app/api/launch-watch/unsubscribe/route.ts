import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeLaunchWatch } from '@/lib/launch-watch';

export const dynamic = 'force-dynamic';

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title} | SpaceNexus</title><meta name="robots" content="noindex"><style>body{background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}main{max-width:520px;text-align:center;padding:2rem}h1{font-size:1.5rem;margin:0 0 .5rem;color:#fff}p{color:#94a3b8;margin:0 0 1.5rem;line-height:1.5}a{color:#22d3ee;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><main><h1>${title}</h1><p>${body}</p><a href="/">Back to SpaceNexus →</a></main></body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// GET for email links (one-click), POST for RFC 8058 List-Unsubscribe-Post.
async function handle(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const all = request.nextUrl.searchParams.get('all') === '1';
  if (!/^[a-f0-9]{48}$/.test(token)) return page('That link is not valid', 'Check the link in your email.', 400);
  const r = await unsubscribeLaunchWatch(token, all);
  if (!r.ok) return page('Nothing to stop', 'That alert was already removed.');
  return page('Alerts stopped', all ? `Removed ${r.count} launch alert${r.count === 1 ? '' : 's'} for this address.` : `That alert is removed. <a href="?token=${token}&all=1">Stop all launch alerts for this address</a> if you want none at all.`);
}
export const GET = handle;
export const POST = handle;
