import { SpaceTalent, TalentExpertiseArea, TalentAvailability } from '@/types';

// Talent directory - empty until real experts are onboarded
export const SPACE_TALENT_SEED: Omit<SpaceTalent, 'id' | 'createdAt' | 'updatedAt'>[] = [];

// Get all talent with optional filters
export async function getTalentBoard(filters?: {
  expertise?: TalentExpertiseArea;
  availability?: TalentAvailability;
  featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ talent: SpaceTalent[]; total: number }> {
  let filteredTalent = SPACE_TALENT_SEED.map((t, index) => ({
    ...t,
    id: `talent-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as SpaceTalent[];

  if (filters?.expertise) {
    filteredTalent = filteredTalent.filter(t => t.expertise.includes(filters.expertise!));
  }

  if (filters?.availability) {
    filteredTalent = filteredTalent.filter(t => t.availability === filters.availability);
  }

  if (filters?.featured !== undefined) {
    filteredTalent = filteredTalent.filter(t => t.featured === filters.featured);
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filteredTalent = filteredTalent.filter(t =>
      t.name.toLowerCase().includes(searchLower) ||
      t.title.toLowerCase().includes(searchLower) ||
      t.organization.toLowerCase().includes(searchLower) ||
      t.bio.toLowerCase().includes(searchLower)
    );
  }

  const total = filteredTalent.length;

  // Apply pagination
  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  filteredTalent = filteredTalent.slice(offset, offset + limit);

  return { talent: filteredTalent, total };
}

// Get single talent by slug
export async function getTalentBySlug(slug: string): Promise<SpaceTalent | null> {
  const talent = SPACE_TALENT_SEED.find(t => t.slug === slug);
  if (!talent) return null;

  const index = SPACE_TALENT_SEED.indexOf(talent);
  return {
    ...talent,
    id: `talent-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as SpaceTalent;
}

// Get talent stats
export async function getTalentStats() {
  const talent = SPACE_TALENT_SEED;

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
