import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { corpContractIdSchema } from '@/lib/validations';
import { gateDiplomacyRequest, parseDiplomacyBody, handlerResponse } from '@/lib/game/diplomacy-route';
import { cancelCorpContract } from '@/lib/game/corp-contracts-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/corp-contracts/cancel — { contractId }
 * Issuer only while the contract is open (escrow refunded). Once accepted,
 * the first call from either party records a `cancel_request`; the other
 * party's matching call settles the contract with no penalty (delivered
 * units paid pro-rata, escrow and collateral returned). Unilateral exit
 * from an accepted contract is /dispute (arbitration), not this route.
 */
export async function POST(request: NextRequest) {
  const gate = await gateDiplomacyRequest('corp-contracts');
  if (!gate.ok) return gate.response;
  const body = await parseDiplomacyBody(request, corpContractIdSchema);
  if (!body.ok) return body.response;
  try {
    return handlerResponse(await cancelCorpContract(gate.profile, body.data.contractId));
  } catch (error) {
    logger.error('Corp contract cancel failed', { error: String(error) });
    return NextResponse.json({ error: 'Cancellation failed' }, { status: 500 });
  }
}
