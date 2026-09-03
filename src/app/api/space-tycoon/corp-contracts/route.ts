import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { corpContractCreateSchema } from '@/lib/validations';
import { gateDiplomacyRequest, parseDiplomacyBody, handlerResponse } from '@/lib/game/diplomacy-route';
import { createCorpContract, listCorpContracts, resolveOverdueCorpContracts } from '@/lib/game/corp-contracts-server';

export const dynamic = 'force-dynamic';

/**
 * Binding corp-to-corp supply contracts (docs/ECONOMY_PVP_2026-08.md
 * "Diplomacy (2026-09-02)").
 *
 * GET  — the open market (others' open contracts I may accept, directed
 *        offers to me), my contracts (both roles), and the live spot map
 *        the price band is measured against.
 * POST — create: { resourceSlug, quantity, pricePerUnit, deadlineDays,
 *        milestoneCount?, penaltyPct?, publicNote?, counterpartyProfileId? |
 *        counterpartyCompanyName? }. Escrows the full value from the issuer
 *        via the One-Wallet ledger (`contract_escrow`).
 *
 * Sub-routes: /accept, /deliver, /cancel, /dispute. Deadline resolution:
 * /api/cron/corp-contracts-resolve (hourly) + a lazy sweep on every GET.
 */
export async function GET() {
  const gate = await gateDiplomacyRequest('corp-contracts-read', false);
  if (!gate.ok) return gate.response;
  try {
    await resolveOverdueCorpContracts().catch(() => null);
    const data = await listCorpContracts(gate.profile.id);
    return NextResponse.json({ ...data, profileId: gate.profile.id });
  } catch (error) {
    logger.error('Corp contracts GET failed', { error: String(error) });
    return NextResponse.json({ open: [], mine: [], spot: {}, profileId: gate.profile.id });
  }
}

export async function POST(request: NextRequest) {
  const gate = await gateDiplomacyRequest('corp-contracts');
  if (!gate.ok) return gate.response;
  const body = await parseDiplomacyBody(request, corpContractCreateSchema);
  if (!body.ok) return body.response;
  try {
    return handlerResponse(await createCorpContract(gate.profile, body.data));
  } catch (error) {
    logger.error('Corp contract create failed', { error: String(error) });
    return NextResponse.json({ error: 'Contract creation failed' }, { status: 500 });
  }
}
