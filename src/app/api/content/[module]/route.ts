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

    return NextResponse.json({
      module,
      section: section || null,
      data: content.flatMap((c) => Array.isArray(c.data) ? c.data : [c.data]),
      items: content,
      meta: {
        count: content.length,
        lastRefreshed: freshness.lastRefreshed,
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
