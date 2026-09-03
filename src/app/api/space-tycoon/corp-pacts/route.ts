import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { corpPactBodySchema } from '@/lib/validations';
import { gateDiplomacyRequest, parseDiplomacyBody, handlerResponse } from '@/lib/game/diplomacy-route';
import { breakCorpPact, expireCorpPacts, listCorpPacts, proposeCorpPact, respondCorpPact } from '@/lib/game/corp-pacts-server';

export const dynamic = 'force-dynamic';

/**
 * Corp-to-corp pacts (docs/ECONOMY_PVP_2026-08.md "Diplomacy (2026-09-02)").
 *
 * GET  — my pacts: active, proposed to me, proposed by me, history.
 * POST — { action: 'propose', kind, counterpartyProfileId | counterpartyCompanyName, durationDays? }
 *        { action: 'accept' | 'decline' | 'break', pactId }
 * Enforcement lives at the offense routes (poach, espionage/execute,
 * market/campaign, zones/challenge) via corp-pacts-server.ts
 * findBlockingPact / findNonAggressionCampaignBlock. Public registry:
 * /api/space-tycoon/corp-pacts/registry.
 */
export async function GET() {
  const gate = await gateDiplomacyRequest('corp-pacts-read', false);
  if (!gate.ok) return gate.response;
  try {
    await expireCorpPacts().catch(() => 0);
    const data = await listCorpPacts(gate.profile.id);
    return NextResponse.json({ ...data, profileId: gate.profile.id });
  } catch (error) {
    logger.error('Corp pacts GET failed', { error: String(error) });
    return NextResponse.json({ active: [], proposedToMe: [], proposedByMe: [], history: [], profileId: gate.profile.id });
  }
}

export async function POST(request: NextRequest) {
  const gate = await gateDiplomacyRequest('corp-pacts');
  if (!gate.ok) return gate.response;
  const body = await parseDiplomacyBody(request, corpPactBodySchema);
  if (!body.ok) return body.response;
  const data = body.data;
  try {
    await expireCorpPacts().catch(() => 0);
    switch (data.action) {
      case 'propose':
        return handlerResponse(await proposeCorpPact(gate.profile, data));
      case 'accept':
        return handlerResponse(await respondCorpPact(gate.profile, data.pactId, true));
      case 'decline':
        return handlerResponse(await respondCorpPact(gate.profile, data.pactId, false));
      case 'break':
        return handlerResponse(await breakCorpPact(gate.profile, data.pactId));
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Corp pact action failed', { error: String(error) });
    return NextResponse.json({ error: 'Pact action failed' }, { status: 500 });
  }
}
