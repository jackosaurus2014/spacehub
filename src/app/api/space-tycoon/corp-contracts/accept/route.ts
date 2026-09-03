import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { corpContractIdSchema } from '@/lib/validations';
import { gateDiplomacyRequest, parseDiplomacyBody, handlerResponse } from '@/lib/game/diplomacy-route';
import { acceptCorpContract } from '@/lib/game/corp-contracts-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/corp-contracts/accept — { contractId }
 * The counterparty posts penaltyPct × totalValue as collateral
 * (`contract_collateral`; waived for a Frontier-shielded corporation — see
 * corp-contracts.ts isFrontierCollateralWaived) and takes on the delivery
 * obligation. Public `contract_signed` activity row.
 */
export async function POST(request: NextRequest) {
  const gate = await gateDiplomacyRequest('corp-contracts');
  if (!gate.ok) return gate.response;
  const body = await parseDiplomacyBody(request, corpContractIdSchema);
  if (!body.ok) return body.response;
  try {
    return handlerResponse(await acceptCorpContract(gate.profile, body.data.contractId));
  } catch (error) {
    logger.error('Corp contract accept failed', { error: String(error) });
    return NextResponse.json({ error: 'Contract acceptance failed' }, { status: 500 });
  }
}
