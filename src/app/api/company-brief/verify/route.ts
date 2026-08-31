import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyWatch } from '@/lib/company-brief';

export const dynamic = 'force-dynamic';

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title} | SpaceNexus</title><meta name="robots" content="noindex"><style>body{background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}main{max-width:520px;text-align:center;padding:2rem}h1{font-size:1.5rem;margin:0 0 .5rem;color:#fff}p{color:#94a3b8;margin:0 0 1.5rem;line-height:1.5}a{color:#22d3ee;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><main><h1>${title}</h1><p>${body}</p><a href="/company-profiles">Browse company profiles →</a></main></body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  if (!/^[a-f0-9]{48}$/.test(token)) return page('That link is not valid', 'Check the link in your email, or set the brief up again.', 400);
  const r = await verifyCompanyWatch(token);
  if (!r.ok) return page('That link is not valid', 'It may have already been used. Set the brief up again if you still want it.', 404);
  return page('Brief confirmed', `Every Monday you will get the week at ${r.companyName} — jobs, contracts, funding, filings and news — and only when something actually happened.`);
}
