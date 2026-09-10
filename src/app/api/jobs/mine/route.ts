import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError } from '@/lib/errors';
import { getJobPostingPlan, postingStatus } from '@/lib/job-posting-plans';

export const dynamic = 'force-dynamic';


/**
 * GET /api/jobs/mine (2026-09-10) — the signed-in employer's postings with
 * status, plan and counters, newest first. The portal's data source.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorizedError();
  const rows = await prisma.spaceJobPosting.findMany({
    where: { postedByUserId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, company: true, location: true, remoteOk: true, category: true, seniorityLevel: true, employmentType: true,
      description: true, sourceUrl: true, contactEmail: true, salaryMin: true, salaryMax: true, clearanceRequired: true,
      planId: true, isActive: true, paidAt: true, expiresAt: true, featured: true, featuredUntil: true, viewCount: true, applyClicks: true,
      createdAt: true, postedDate: true, companyProfile: { select: { slug: true, name: true } },
    },
  });
  const now = Date.now();
  return NextResponse.json({
    postings: rows.map((r) => ({
      ...r,
      status: postingStatus(r, now),
      plan: getJobPostingPlan(r.planId),
      paidAt: r.paidAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      featuredUntil: r.featuredUntil?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      postedDate: r.postedDate.toISOString(),
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
