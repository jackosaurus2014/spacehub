import { NextRequest, NextResponse } from 'next/server';
import { getModuleContent, getModuleFreshness } from '@/lib/dynamic-content';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { module: string } }
) {
  const { module } = params;
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section');

  try {
    const content = section
      ? await getModuleContent(module, section)
      : await getModuleContent(module);

    const freshness = await getModuleFreshness(module);

    // Oldest refreshedAt among the rows actually being returned (scoped to
    // `section` when given, otherwise the whole module). `lastRefreshed`
    // above is module-wide-newest and can hide stale sections behind one
    // frequently-refreshed key (the stale-content audit's root cause) —
    // `oldestRefreshed` lets callers show an honest "as of" date for what
    // they're actually rendering. Additive field; existing consumers are
    // unaffected.
    const oldestRefreshed = content.length > 0
      ? content.reduce((min, c) => (c.refreshedAt < min ? c.refreshedAt : min), content[0].refreshedAt)
      : null;

    return NextResponse.json({
      module,
      section: section || null,
      data: content.flatMap((c) => Array.isArray(c.data) ? c.data : [c.data]),
      items: content,
      meta: {
        count: content.length,
        lastRefreshed: freshness.lastRefreshed,
        oldestRefreshed,
        activeItems: freshness.active,
        staleItems: freshness.stale,
        sourceBreakdown: freshness.sourceBreakdown,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch content for module: ${module}` },
      { status: 500 }
    );
  }
}
