import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createCompanyWatch } from '@/lib/company-brief';
import { validationError } from '@/lib/errors';

// POST /api/company-brief — subscribe an email to a weekly company brief
// (no account). Identify the company by companyProfileId or slug. Always
// responds success-ish to avoid confirming whether an address is known;
// the real gate is the double opt-in email.
export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email().max(254),
  companyProfileId: z.string().min(10).max(40).optional(),
  slug: z.string().min(2).max(120).optional(),
  source: z.string().max(60).optional(),
  // honeypot
  website: z.string().max(0).optional(),
}).refine((v) => [v.companyProfileId, v.slug].filter(Boolean).length === 1, { message: 'Choose one: a company id or a slug' });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues.map((i) => i.message).join('; '));
  const { email, companyProfileId, slug, source } = parsed.data;
  const r = await createCompanyWatch(email, { companyProfileId, slug }, source ?? 'company-page');
  if (r.status === 'not-found') return NextResponse.json({ ok: false, error: 'Unknown company.' }, { status: 404 });
  if (r.status === 'limit') return NextResponse.json({ ok: false, error: 'Too many briefs for this email. Unsubscribe from a few first.' }, { status: 429 });
  if (r.status === 'error') return NextResponse.json({ ok: false, error: 'Could not send the confirmation email. Try again in a minute.' }, { status: 502 });
  return NextResponse.json({ ok: true, status: r.status });
}
