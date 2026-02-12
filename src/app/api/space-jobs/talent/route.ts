import { NextRequest, NextResponse } from 'next/server';
import { SpaceTalent, TalentExpertiseArea, TalentAvailability } from '@/types';
import { SPACE_TALENT_SEED } from '@/lib/talent-board-data';
import { getModuleContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const expertise = searchParams.get('expertise') as TalentExpertiseArea | null;
    const availability = searchParams.get('availability') as TalentAvailability | null;
    const featured = searchParams.get('featured');
    const search = searchParams.get('search') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Load talent: try DynamicContent first, fall back to seed data
    let allTalent: SpaceTalent[] = SPACE_TALENT_SEED.map((t, index) => ({
      ...t,
      id: `talent-${index + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as SpaceTalent[];

    try {
      const dynamicData = await getModuleContent<SpaceTalent>('talent-board');
      if (dynamicData.length > 0) {
        allTalent = dynamicData.map((item) => item.data);
      }
    } catch {
      // DynamicContent unavailable, use fallback seed data
    }

    if (type === 'stats') {
      const stats = computeStats(allTalent);
      return NextResponse.json({ stats });
    }

    // Apply filters
    let filteredTalent = [...allTalent];

    if (expertise) {
      filteredTalent = filteredTalent.filter(t => t.expertise.includes(expertise));
    }

    if (availability) {
      filteredTalent = filteredTalent.filter(t => t.availability === availability);
    }

    if (featured === 'true') {
      filteredTalent = filteredTalent.filter(t => t.featured === true);
    } else if (featured === 'false') {
      filteredTalent = filteredTalent.filter(t => t.featured === false);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredTalent = filteredTalent.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.title.toLowerCase().includes(searchLower) ||
        t.organization.toLowerCase().includes(searchLower) ||
        t.bio.toLowerCase().includes(searchLower)
      );
    }

    const total = filteredTalent.length;
    filteredTalent = filteredTalent.slice(offset, offset + limit);

    const stats = computeStats(allTalent);

    return NextResponse.json({
      talent: filteredTalent,
      total,
      stats,
    });
  } catch (error) {
    logger.error('Failed to fetch talent data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch talent data' },
      { status: 500 }
    );
  }
}

function computeStats(talent: SpaceTalent[]) {
  const byExpertise: Record<string, number> = {};
  talent.forEach(t => {
    t.expertise.forEach(exp => {
      byExpertise[exp] = (byExpertise[exp] || 0) + 1;
    });
  });

  const byAvailability: Record<TalentAvailability, number> = {
    available: 0,
    limited: 0,
    booked: 0,
    unavailable: 0,
  };
  talent.forEach(t => {
    byAvailability[t.availability]++;
  });

  const talentWithRates = talent.filter(t => t.consultingRate);
  const avgRate = talentWithRates.length > 0
    ? talentWithRates.reduce((sum, t) => sum + (t.consultingRate || 0), 0) / talentWithRates.length
    : 0;

  return {
    totalExperts: talent.length,
    featuredCount: talent.filter(t => t.featured).length,
    availableCount: talent.filter(t => t.availability === 'available').length,
    byExpertise,
    byAvailability,
    avgConsultingRate: Math.round(avgRate),
  };
}
