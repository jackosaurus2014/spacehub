import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLaunchWatch } from '@/lib/launch-watch';
import { validationError } from '@/lib/errors';

// POST /api/launch-watch — subscribe an email to launch alerts (no account).
// Exactly one scope: eventId, rocket, or site. Always responds success-ish
// to avoid confirming whether an address is known; the real gate is the
// double opt-in email.
export const dynamic = 'force-dynamic';

// Rocket/site names are echoed into emails and the verify page (escaped
// there too); restrict them to the characters real names use so a payload
// never even reaches storage (2026-09-01, H3).
const NAME_RE = /^[\p{L}\p{N} .,'&()\/-]+$/u;
const scopeName = (max: number) =>
  z.string().trim().min(2).max(max).regex(NAME_RE, 'Only letters, numbers, spaces and basic punctuation');

const schema = z.object({
  email: z.string().email().max(254),
  eventId: z.string().min(10).max(40).regex(/^[A-Za-z0-9_-]+$/).optional(),
  rocket: scopeName(60).optional(),
  site: scopeName(80).optional(),
  source: z.string().max(60).optional(),
  // honeypot
  website: z.string().max(0).optional(),
}).refine((v) => [v.eventId, v.rocket, v.site].filter(Boolean).length === 1, { message: 'Choose one: a launch, a rocket, or a site' });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues.map((i) => i.message).join('; '));
  const { email, eventId, rocket, site, source } = parsed.data;
  const r = await createLaunchWatch(email, { eventId, rocket, site }, source ?? 'launch-page');
  if (r.status === 'limit') return NextResponse.json({ ok: false, error: 'Too many alerts for this email. Unsubscribe from a few first.' }, { status: 429 });
  if (r.status === 'error') return NextResponse.json({ ok: false, error: 'Could not send the confirmation email. Try again in a minute.' }, { status: 502 });
  return NextResponse.json({ ok: true, status: r.status });
}
