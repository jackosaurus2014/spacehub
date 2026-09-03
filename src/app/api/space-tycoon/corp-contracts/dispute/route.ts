import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { corpContractIdSchema } from '@/lib/validations';
import { gateDiplomacyRequest, parseDiplomacyBody, handlerResponse } from '@/lib/game/diplomacy-route';
import { disputeCorpContract } from '@/lib/game/corp-contracts-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/corp-contracts/dispute — { contractId }
 * Either party of an accepted contract, once. The 2% fee is BURNED
 * (`arbitration_fee`) and the ruling is immediate and deterministic
 * (corp-contracts.ts computeArbitrationRuling): delivered units paid,
 * penalty on the shortfall transferred to the issuer, everything else
 * returned, flavoured as the arbitration bureau of the faction whose home
 * region the resource belongs to. No human moderation loop.
 */
export async function POST(request: NextRequest) {
  const gate = await gateDiplomacyRequest('corp-contracts');
  if (!gate.ok) return gate.response;
  const body = await parseDiplomacyBody(request, corpContractIdSchema);
  if (!body.ok) return body.response;
  try {
    return handlerResponse(await disputeCorpContract(gate.profile, body.data.contractId));
  } catch (error) {
    logger.error('Corp contract dispute failed', { error: String(error) });
    return NextResponse.json({ error: 'Arbitration failed' }, { status: 500 });
  }
}
