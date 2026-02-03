import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { initializeCompanies } from '@/lib/companies-data';

export async function POST() {
  try {
    const result = await initializeCompanies();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to initialize companies:', error);
    return NextResponse.json(
      { error: 'Failed to initialize companies' },
      { status: 500 }
    );
  }
}
