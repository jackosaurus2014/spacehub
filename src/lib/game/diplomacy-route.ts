// ─── Space Tycoon: Diplomacy routes — shared session/profile/throttle gate ──
// The corp-contract and corp-pact routes all open the same way: session →
// GameProfile → per-profile throttle (route-throttle.ts, M-7) → zod body.
// One helper so the nine thin route files cannot drift apart.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { allow as throttleAllow, throttledBody } from './route-throttle';
import { validateBody } from '@/lib/validations';
import { validationError } from '@/lib/errors';
import type { z } from 'zod';
import type { ContractProfileRow } from './corp-contracts-server';

export type DiplomacyProfile = ContractProfileRow;

export type GateResult =
  | { ok: true; profile: DiplomacyProfile }
  | { ok: false; response: NextResponse };

/** Per-profile budget for every diplomacy mutation. */
export const DIPLOMACY_THROTTLE_MAX = 10;
export const DIPLOMACY_THROTTLE_WINDOW_MS = 60_000;

export async function gateDiplomacyRequest(routeKey: string, throttle = true): Promise<GateResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const profile = await prisma.gameProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true, companyName: true, money: true, netWorth: true, createdAt: true,
      resources: true, serverResources: true, workforceData: true,
    },
  });
  if (!profile) {
    return { ok: false, response: NextResponse.json({ error: 'No game profile' }, { status: 404 }) };
  }
  if (throttle) {
    const decision = throttleAllow(profile.id, routeKey, DIPLOMACY_THROTTLE_MAX, DIPLOMACY_THROTTLE_WINDOW_MS);
    if (!decision.allowed) {
      return { ok: false, response: NextResponse.json(throttledBody(routeKey, decision), { status: 429 }) };
    }
  }
  return { ok: true, profile };
}

export async function parseDiplomacyBody<S extends z.ZodTypeAny>(request: NextRequest, schema: S): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  const parsed = validateBody(schema, await request.json().catch(() => null));
  if (!parsed.success) {
    const first = Object.values(parsed.errors)[0]?.[0] || 'Invalid request body';
    return { ok: false, response: validationError(first, parsed.errors) };
  }
  return { ok: true, data: parsed.data };
}

export function handlerResponse(result: { status: number; body: Record<string, unknown> }): NextResponse {
  return NextResponse.json(result.body, { status: result.status });
}
