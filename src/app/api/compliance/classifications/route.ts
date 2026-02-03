import { NextResponse } from 'next/server';
import { getExportClassifications } from '@/lib/compliance-data';
import { ExportRegime, ClassificationCategory } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const regime = searchParams.get('regime') as ExportRegime | null;
    const category = searchParams.get('category') as ClassificationCategory | null;
    const search = searchParams.get('search') || undefined;

    const classifications = await getExportClassifications({
      regime: regime || undefined,
      category: category || undefined,
      search,
    });

    return NextResponse.json({ classifications });
  } catch (error) {
    console.error('Failed to fetch export classifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch export classifications' },
      { status: 500 }
    );
  }
}
