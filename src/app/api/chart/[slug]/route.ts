import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getChartDef } from '@/lib/charts/registry';
import { loadChartSeries } from '@/lib/charts/data';
import { renderBarChartSvg } from '@/lib/charts/render';

// Chart of the Week image. PNG by default (email clients do not render inline
// SVG), ?format=svg for the page. Unknown slug → 404 (the middleware already
// 404s /chart/[slug] pages; this is the image endpoint's own check).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const def = getChartDef(params.slug);
  if (!def) return new NextResponse('Not found', { status: 404 });

  const series = await loadChartSeries(def.slug);
  if (!series) return new NextResponse('No data yet', { status: 404 });

  const svg = renderBarChartSvg(def, series);
  const format = req.nextUrl.searchParams.get('format');
  const cache = 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400';

  if (format === 'svg') {
    return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': cache } });
  }
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new NextResponse(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': cache } });
}
