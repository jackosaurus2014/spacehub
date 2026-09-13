import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { resolveSalaryCompany } from '@/lib/salaries-by-company';

export const dynamic = 'force-dynamic';

// Minimal, side-effect-free existence check used by middleware.ts to give
// /salaries/[company] a real HTTP 404 for unknown employers and for
// employers below the SALARY_PAGE_MIN_ROLES threshold (2026-09-13). See the
// SLUG_EXISTENCE_CHECKS comment in middleware.ts for why notFound() alone
// can't set the status code. Mirrors the page's own gate exactly: the same
// resolver the page uses decides.
export async function GET(_request: NextRequest, props: { params: Promise<{ company: string }> }) {
  const { company } = await props.params;
  if (!company || company.length > 200) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }
  try {
    const row = await resolveSalaryCompany(company);
    if (!row) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
    logger.error('Company salaries existence check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail open (200) so a transient DB error never masquerades as a 404.
    return NextResponse.json({ exists: true, error: true }, { status: 200 });
  }
}
