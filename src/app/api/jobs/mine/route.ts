import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError } from '@/lib/errors';
import { getJobPostingPlan, postingStatus } from '@/lib/job-posting-plans';
import { employerOwnsWhere } from '@/lib/job-posting-server';

export const dynamic = 'force-dynamic';


/**
 * GET /api/jobs/mine (2026-09-10) — the signed-in employer's postings with
 * status, plan, counters and applicant counts, newest first. Includes every
 * listing of a company profile this account has claimed. The portal's data
 * source.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorizedError();
  const rows = await prisma.spaceJobPosting.findMany({
    where: employerOwnsWhere(session.user.id),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, company: true, location: true, remoteOk: true, category: true, seniorityLevel: true, employmentType: true,
      description: true, sourceUrl: true, contactEmail: true, salaryMin: true, salaryMax: true, clearanceRequired: true, applyMode: true,
      planId: true, isActive: true, paidAt: true, expiresAt: true, featured: true, featuredUntil: true, viewCount: true, applyClicks: true, stripeReceiptUrl: true,
      createdAt: true, postedDate: true, companyProfile: { select: { slug: true, name: true } },
      _count: { select: { applications: true } },
      applications: { where: { status: 'new' }, select: { id: true } },
    },
  });
  const now = Date.now();
  return NextResponse.json({
    postings: rows.map(({ _count, applications, ...r }) => ({
      ...r,
      applicantCount: _count.applications,
      newApplicantCount: applications.length,
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
