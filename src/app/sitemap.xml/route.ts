import { NextResponse } from 'next/server';

// /sitemap.xml was a 404 (Next's generateSitemaps only emits /sitemap/N.xml);
// robots.txt lists the parts, but crawlers and tools try the conventional
// index first. Serve a sitemap index pointing at every part.
export const dynamic = 'force-static';

const BASE = 'https://spacenexus.us';
const PARTS = ['/sitemap/0.xml', '/sitemap/1.xml', '/sitemap/2.xml', '/sitemap/3.xml', '/jobs-sitemap.xml'];

export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PARTS.map((p) => `  <sitemap><loc>${BASE}${p}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  return new NextResponse(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
