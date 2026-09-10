import prisma from '@/lib/db';

/**
 * Server-side employer ownership (2026-09-10). A direct posting belongs to
 * the account that created it AND to whoever has claimed the company profile
 * it is linked to — so a colleague who claimed "Acme Space" on
 * /company-profiles can manage every Acme listing without a team-invite
 * system. Keep this out of job-posting-plans.ts, which client components
 * import.
 */
export function employerOwnsWhere(userId: string) {
  return { source: 'direct' as const, OR: [{ postedByUserId: userId }, { companyProfile: { claimedByUserId: userId } }] };
}

export async function ownedJobPosting(id: string, userId: string) {
  return prisma.spaceJobPosting.findFirst({
    where: { id, ...employerOwnsWhere(userId) },
    select: { id: true, title: true, postedByUserId: true, source: true, planId: true, paidAt: true, expiresAt: true, isActive: true, featured: true, featuredUntil: true, salaryMin: true, salaryMax: true, applyMode: true },
  });
}
