import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getChartWeekEdition } from '@/lib/chart-week';
import { getChartDef, type ChartDef } from '@/lib/charts/registry';
import { renderBarChartSvg } from '@/lib/charts/render';

// The image for a PINNED Chart of the Week edition.
//
// /api/chart/[slug] redraws live data; this one draws the frozen series out of
// the edition row, so the PNG a reader shared six months ago still shows the
// numbers that were published that week. The display metadata is taken from
// the edition too, not from the registry, so a later edit to a chart's title
// cannot rewrite what a published edition said.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ week: string }> }) {
  const { week } = await props.params;
  const edition = await getChartWeekEdition(week);
  if (!edition) return new NextResponse('Not found', { status: 404 });

  // Fall back to the frozen metadata when the registry entry has since gone.
  const registryDef = getChartDef(edition.slug);
  const def: ChartDef = {
    slug: edition.slug,
    title: edition.title,
    subtitle: edition.subtitle,
    source: edition.source,
    unit: edition.unit,
    exploreHref: registryDef?.exploreHref ?? '/chart/week',
    exploreLabel: registryDef?.exploreLabel ?? 'Chart of the Week',
  };

  const svg = renderBarChartSvg(
    def,
    { labels: edition.labels, values: edition.values, note: edition.note ?? undefined },
    { asOf: new Date(edition.publishedAt) }
  );

  // A pinned edition never changes, so it can be cached hard.
  const cache = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800';
  if (req.nextUrl.searchParams.get('format') === 'svg') {
    return new NextResponse(svg, {
      headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': cache },
    });
  }
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': cache },
  });
}
