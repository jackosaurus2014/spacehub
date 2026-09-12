import prisma from '@/lib/db';

/**
 * Every employer with live postings, for the /jobs/companies index
 * (2026-09-12). One row per company name; profile slug when linked, so the
 * index can point at the company page as well as the filtered board.
 */
export interface JobsByCompanyRow {
  name: string;
  slug: string | null;
  activeCount: number;
  remoteCount: number;
}

export async function getJobsByCompany(minCount = 1): Promise<{ rows: JobsByCompanyRow[]; totalActive: number; asOf: Date }> {
  const now = new Date();
  const [groups, remoteGroups, totalActive] = await Promise.all([
    prisma.spaceJobPosting.groupBy({
      by: ['company'],
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      _count: { _all: true },
      orderBy: { _count: { company: 'desc' } },
    }),
    prisma.spaceJobPosting.groupBy({
      by: ['company'],
      where: { isActive: true, remoteOk: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      _count: { _all: true },
    }),
    prisma.spaceJobPosting.count({ where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
  ]);
  const names = groups.filter((g) => g._count._all >= minCount).map((g) => g.company);
  const slugRows = names.length
    ? await prisma.spaceJobPosting.findMany({
        where: { company: { in: names }, companyProfileId: { not: null } },
        distinct: ['company'],
        select: { company: true, companyProfile: { select: { slug: true } } },
      })
    : [];
  const slugByName = new Map(slugRows.map((r) => [r.company, r.companyProfile?.slug ?? null]));
  const remoteByName = new Map(remoteGroups.map((g) => [g.company, g._count._all]));
  const rows = groups
    .filter((g) => g._count._all >= minCount)
    .map((g) => ({ name: g.company, slug: slugByName.get(g.company) ?? null, activeCount: g._count._all, remoteCount: remoteByName.get(g.company) ?? 0 }));
  return { rows, totalActive, asOf: now };
}
