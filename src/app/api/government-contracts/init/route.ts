import { NextResponse } from 'next/server';
import { initializeGovernmentContracts } from '@/lib/government-contracts-data';

export async function POST() {
  try {
    const result = await initializeGovernmentContracts();
    return NextResponse.json({
      success: true,
      message: `Initialized ${result.count} government contracts`,
      count: result.count,
    });
  } catch (error) {
    console.error('Failed to initialize government contracts:', error);
    return NextResponse.json(
      { error: 'Failed to initialize government contracts' },
      { status: 500 }
    );
  }
}
