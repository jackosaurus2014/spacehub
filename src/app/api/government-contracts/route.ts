import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

import {
  getGovernmentContracts,
  getRecentContracts,
  getContractStats,
  ContractAgency,
  ContractType,
  ContractStatus,
  ContractCategory,
} from '@/lib/government-contracts-data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agency = searchParams.get('agency') as ContractAgency | null;
    const type = searchParams.get('type') as ContractType | null;
    const status = searchParams.get('status') as ContractStatus | null;
    const category = searchParams.get('category') as ContractCategory | null;
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');
    const recent = searchParams.get('recent') === 'true';
    const stats = searchParams.get('stats') === 'true';

    // Return stats if requested
    if (stats) {
      const contractStats = await getContractStats();
      return NextResponse.json(contractStats);
    }

    // Return recent contracts for ticker if requested
    if (recent) {
      const recentContracts = await getRecentContracts(limit);
      return NextResponse.json({ contracts: recentContracts });
    }

    // Get contracts with filters
    const result = await getGovernmentContracts({
      agency: agency || undefined,
      type: type || undefined,
      status: status || undefined,
      category: category || undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to fetch government contracts', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch government contracts' },
      { status: 500 }
    );
  }
}
