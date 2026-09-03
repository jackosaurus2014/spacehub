import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { corpContractDeliverSchema } from '@/lib/validations';
import { gateDiplomacyRequest, parseDiplomacyBody, handlerResponse } from '@/lib/game/diplomacy-route';
import { deliverCorpContract } from '@/lib/game/corp-contracts-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/corp-contracts/deliver — { contractId, quantity? }
 * Transfers units from the counterparty's AUTHORITATIVE inventory
 * (server-inventory.ts) to the issuer and releases escrow per milestone
 * (`contract_payment`). Quantity omitted = deliver everything outstanding.
 */
export async function POST(request: NextRequest) {
  const gate = await gateDiplomacyRequest('corp-contracts');
  if (!gate.ok) return gate.response;
  const body = await parseDiplomacyBody(request, corpContractDeliverSchema);
  if (!body.ok) return body.response;
  try {
    return handlerResponse(await deliverCorpContract(gate.profile, body.data.contractId, body.data.quantity));
  } catch (error) {
    logger.error('Corp contract deliver failed', { error: String(error) });
    return NextResponse.json({ error: 'Delivery failed' }, { status: 500 });
  }
}
