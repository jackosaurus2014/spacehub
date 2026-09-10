import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { salaryBandFor } from '@/lib/salary-estimate';

export const dynamic = 'force-dynamic';

/**
 * GET /api/jobs/search (2026-09-10) — the job board's query.
 *
 *   q             free text over title, company, description
 *   category      engineering | operations | business | research | legal | manufacturing
 *   level         entry | mid | senior | lead | director | vp | c_suite (comma-separated ok)
 *   remote=1      remote-OK only
 *   company       exact company name
 *   location      substring of the location string ("Texas", "Denver", "Remote")
 *   posted        days back (7, 14, 30)
 *   clearance=0   exclude clearance-required roles
 *   type          employmentType substring (full-time, contract, intern)
 *   sort          newest (default) | company | title
 *   limit/offset  page (limit ≤ 50)
 *
 * Returns rows with a salary band (posting range or SpaceNexus estimate),
 * the total, and facets for the sidebar. Featured (paid) listings sort first
 * when the column exists.
 */
const CATEGORIES = new Set(['engineering', 'operations', 'business', 'research', 'legal', 'manufacturing']);
const LEVELS = new Set(['entry', 'mid', 'senior', 'lead', 'director', 'vp', 'c_suite']);

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = (sp.get('q') || '').trim().slice(0, 100);
  const category = sp.get('category') || '';
  const levels = (sp.get('level') || '').split(',').map((s) => s.trim()).filter((s) => LEVELS.has(s));
  const remote = sp.get('remote') === '1';
  const company = (sp.get('company') || '').trim().slice(0, 120);
  const location = (sp.get('location') || '').trim().slice(0, 80);
  const posted = Math.min(365, Math.max(0, parseInt(sp.get('posted') || '0', 10) || 0));
  const noClearance = sp.get('clearance') === '0';
  const type = (sp.get('type') || '').trim().slice(0, 30);
  const sort = sp.get('sort') || 'newest';
  const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '20', 10) || 20));
  const offset = Math.max(0, parseInt(sp.get('offset') || '0', 10) || 0);

  const where: Prisma.SpaceJobPostingWhereInput = { isActive: true, AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }] };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { company: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { specialization: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (CATEGORIES.has(category)) where.category = category;
  if (levels.length) where.seniorityLevel = { in: levels };
  if (remote) where.remoteOk = true;
  if (company) where.company = { equals: company, mode: 'insensitive' };
  if (location) where.location = { contains: location, mode: 'insensitive' };
  if (posted) where.postedDate = { gte: new Date(Date.now() - posted * 86_400_000) };
  if (noClearance) where.clearanceRequired = false;
  if (type) where.employmentType = { contains: type, mode: 'insensitive' };

  const orderBy: Prisma.SpaceJobPostingOrderByWithRelationInput[] =
    sort === 'company' ? [{ featured: 'desc' }, { company: 'asc' }, { postedDate: 'desc' }]
    : sort === 'title' ? [{ featured: 'desc' }, { title: 'asc' }]
    : [{ featured: 'desc' }, { postedDate: 'desc' }, { id: 'asc' }];

  try {
    const [total, rows, catFacet, levelFacet, companyFacet, remoteCount] = await Promise.all([
      prisma.spaceJobPosting.count({ where }),
      prisma.spaceJobPosting.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id: true, title: true, company: true, location: true, remoteOk: true, category: true, specialization: true,
          seniorityLevel: true, employmentType: true, salaryMin: true, salaryMax: true, salaryMedian: true,
          clearanceRequired: true, postedDate: true, source: true, featured: true, featuredUntil: true,
          companyProfile: { select: { slug: true, logoUrl: true } },
        },
      }),
      prisma.spaceJobPosting.groupBy({ by: ['category'], where: { ...where, category: undefined }, _count: { _all: true } }),
      prisma.spaceJobPosting.groupBy({ by: ['seniorityLevel'], where: { ...where, seniorityLevel: undefined }, _count: { _all: true } }),
      prisma.spaceJobPosting.groupBy({ by: ['company'], where: { ...where, company: undefined }, _count: { _all: true }, orderBy: { _count: { company: 'desc' } }, take: 25 }),
      prisma.spaceJobPosting.count({ where: { ...where, remoteOk: true } }),
    ]);

    const jobs = rows.map((r) => ({
      ...r,
      postedDate: r.postedDate.toISOString(),
      featured: r.featured && (!r.featuredUntil || r.featuredUntil > new Date()),
      featuredUntil: r.featuredUntil ? r.featuredUntil.toISOString() : null,
      salaryBand: salaryBandFor(r),
    }));

    return NextResponse.json(
      {
        total,
        offset,
        limit,
        jobs,
        facets: {
          categories: catFacet.map((c) => ({ value: c.category, count: c._count._all })).sort((a, b) => b.count - a.count),
          levels: levelFacet.map((l) => ({ value: l.seniorityLevel, count: l._count._all })).sort((a, b) => b.count - a.count),
          companies: companyFacet.map((c) => ({ value: c.company, count: c._count._all })),
          remote: remoteCount,
        },
      },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
    );
  } catch (error) {
    logger.error('Job search failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Search unavailable' }, { status: 500 });
  }
}
