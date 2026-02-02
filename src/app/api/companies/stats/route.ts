'use server';

import { NextResponse } from 'next/server';
import { getCompanyStats } from '@/lib/companies-data';

export async function GET() {
  try {
    const stats = await getCompanyStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch company stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company stats' },
      { status: 500 }
    );
  }
}
