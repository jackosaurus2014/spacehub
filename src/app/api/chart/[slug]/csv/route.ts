import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getChartDef } from '@/lib/charts/registry';
import { loadChartSeries } from '@/lib/charts/data';
import { logger } from '@/lib/logger';

// G3 (growth plan): CSV export for every chart, gated behind a FREE account —
// the export is the lead-gen ask, never a paywall. Unauthenticated hits are
// redirected to /login with a callback to the chart page (a download link
// can't render a JSON error usefully).
export const dynamic = 'force-dynamic';

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(request: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const def = getChartDef(params.slug);
  if (!def) return NextResponse.json({ error: 'Unknown chart' }, { status: 404 });

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const cb = encodeURIComponent(`/chart/${def.slug}`);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${cb}&reason=csv`, request.url), 302);
  }

  try {
    const series = await loadChartSeries(def.slug);
    if (!series) return NextResponse.json({ error: 'No data available yet' }, { status: 404 });
    const lines = [
      `# ${def.title}`,
      `# ${def.subtitle}`,
      `# Source: ${def.source}`,
      `# Retrieved: ${new Date().toISOString()}`,
      `# Cite: SpaceNexus, https://spacenexus.us/chart/${def.slug}`,
      'label,value',
      ...series.labels.map((l, i) => `${csvEscape(l)},${series.values[i] ?? ''}`),
    ];
    return new NextResponse(lines.join('\n') + '\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="spacenexus-${def.slug}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    logger.warn('chart csv export failed', { slug: params.slug, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
