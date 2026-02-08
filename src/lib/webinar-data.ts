import { Webinar } from '@/types';

// Webinar data - empty until real webinars are scheduled
export const WEBINARS_SEED: Omit<Webinar, 'id' | 'createdAt' | 'updatedAt'>[] = [];

// Get webinars with optional filters
export async function getWebinars(filters?: {
  topic?: string;
  isLive?: boolean;
  isPast?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ webinars: Webinar[]; total: number }> {
  let filteredWebinars = WEBINARS_SEED.map((w, index) => ({
    ...w,
    id: `webinar-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as Webinar[];

  if (filters?.topic) {
    filteredWebinars = filteredWebinars.filter(w => w.topic === filters.topic);
  }

  if (filters?.isLive !== undefined) {
    filteredWebinars = filteredWebinars.filter(w => w.isLive === filters.isLive);
  }

  if (filters?.isPast !== undefined) {
    filteredWebinars = filteredWebinars.filter(w => w.isPast === filters.isPast);
  }

  // Sort: Live first, then upcoming by date, then past by date (newest first)
  filteredWebinars.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    if (!a.isPast && !b.isPast) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (a.isPast && b.isPast) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (!a.isPast && b.isPast) return -1;
    return 1;
  });

  const total = filteredWebinars.length;

  // Apply pagination
  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  filteredWebinars = filteredWebinars.slice(offset, offset + limit);

  return { webinars: filteredWebinars, total };
}

// Get single webinar by slug
export async function getWebinarBySlug(slug: string): Promise<Webinar | null> {
  const webinar = WEBINARS_SEED.find(w => w.slug === slug);
  if (!webinar) return null;

  const index = WEBINARS_SEED.indexOf(webinar);
  return {
    ...webinar,
    id: `webinar-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Webinar;
}

// Get webinar stats
export async function getWebinarStats() {
  const webinars = WEBINARS_SEED;

  const byTopic: Record<string, number> = {};
  webinars.forEach(w => {
    byTopic[w.topic] = (byTopic[w.topic] || 0) + 1;
  });

  return {
    totalWebinars: webinars.length,
    liveCount: webinars.filter(w => w.isLive).length,
    upcomingCount: webinars.filter(w => !w.isPast && !w.isLive).length,
    pastCount: webinars.filter(w => w.isPast).length,
    recordingsAvailable: webinars.filter(w => w.recordingUrl).length,
    byTopic,
    avgDuration: webinars.length > 0
      ? Math.round(webinars.reduce((sum, w) => sum + w.duration, 0) / webinars.length)
      : 0,
  };
}
