import prisma from '@/lib/db';
import { getExpiresAt } from '@/lib/freshness-policies';
import { logger } from '@/lib/logger';

export interface ContentMeta {
  sourceType: 'api' | 'ai-research' | 'seed' | 'manual';
  sourceUrl?: string;
  aiConfidence?: number;
  aiNotes?: string;
  expiresAt?: Date;
}

export interface ContentWithMeta<T = unknown> {
  contentKey: string;
  section: string | null;
  data: T;
  refreshedAt: Date;
  sourceType: string;
  aiConfidence: number | null;
  isActive: boolean;
}

// Get all active content for a module, optionally filtered by section
export async function getModuleContent<T = unknown>(
  module: string,
  section?: string
): Promise<ContentWithMeta<T>[]> {
  const rows = await prisma.dynamicContent.findMany({
    where: {
      module,
      isActive: true,
      ...(section ? { section } : {}),
    },
    orderBy: { contentKey: 'asc' },
  });

  return rows.map((row) => ({
    contentKey: row.contentKey,
    section: row.section,
    data: JSON.parse(row.data) as T,
    refreshedAt: row.refreshedAt,
    sourceType: row.sourceType,
    aiConfidence: row.aiConfidence,
    isActive: row.isActive,
  }));
}

// Get a single content item by key
export async function getContentItem<T = unknown>(
  contentKey: string
): Promise<ContentWithMeta<T> | null> {
  const row = await prisma.dynamicContent.findUnique({
    where: { contentKey },
  });

  if (!row || !row.isActive) return null;

  return {
    contentKey: row.contentKey,
    section: row.section,
    data: JSON.parse(row.data) as T,
    refreshedAt: row.refreshedAt,
    sourceType: row.sourceType,
    aiConfidence: row.aiConfidence,
    isActive: row.isActive,
  };
}

// Insert or update a content item
export async function upsertContent(
  contentKey: string,
  module: string,
  section: string | null,
  data: unknown,
  meta: ContentMeta
): Promise<void> {
  const expiresAt = meta.expiresAt || getExpiresAt(module);
  const jsonData = JSON.stringify(data);

  await prisma.dynamicContent.upsert({
    where: { contentKey },
    create: {
      contentKey,
      module,
      section,
      data: jsonData,
      sourceType: meta.sourceType,
      sourceUrl: meta.sourceUrl,
      aiConfidence: meta.aiConfidence,
      aiNotes: meta.aiNotes,
      expiresAt,
      refreshedAt: new Date(),
      lastVerified: new Date(),
      isActive: true,
    },
    update: {
      data: jsonData,
      sourceType: meta.sourceType,
      sourceUrl: meta.sourceUrl,
      aiConfidence: meta.aiConfidence,
      aiNotes: meta.aiNotes,
      expiresAt,
      refreshedAt: new Date(),
      lastVerified: new Date(),
      isActive: true,
      version: { increment: 1 },
    },
  });
}

// Bulk upsert multiple items for a module
export async function bulkUpsertContent(
  module: string,
  items: Array<{
    contentKey: string;
    section: string | null;
    data: unknown;
  }>,
  meta: ContentMeta
): Promise<number> {
  let count = 0;
  for (const item of items) {
    await upsertContent(item.contentKey, module, item.section, item.data, meta);
    count++;
  }
  return count;
}

// Mark expired content as inactive
export async function expireStaleContent(module?: string): Promise<number> {
  const result = await prisma.dynamicContent.updateMany({
    where: {
      isActive: true,
      expiresAt: { lt: new Date() },
      ...(module ? { module } : {}),
    },
    data: { isActive: false },
  });

  if (result.count > 0) {
    logger.info(`Expired ${result.count} stale content items`, { module: module || 'all' });
  }

  return result.count;
}

// Get freshness status for a module
export async function getModuleFreshness(module: string): Promise<{
  total: number;
  active: number;
  stale: number;
  expired: number;
  lastRefreshed: Date | null;
  sourceBreakdown: Record<string, number>;
}> {
  const now = new Date();

  const items = await prisma.dynamicContent.findMany({
    where: { module },
    select: {
      isActive: true,
      expiresAt: true,
      refreshedAt: true,
      sourceType: true,
    },
  });

  const sourceBreakdown: Record<string, number> = {};
  let stale = 0;
  let expired = 0;
  let latestRefresh: Date | null = null;

  for (const item of items) {
    sourceBreakdown[item.sourceType] = (sourceBreakdown[item.sourceType] || 0) + 1;

    if (item.expiresAt < now) {
      if (item.isActive) stale++;
      else expired++;
    }

    if (!latestRefresh || item.refreshedAt > latestRefresh) {
      latestRefresh = item.refreshedAt;
    }
  }

  return {
    total: items.length,
    active: items.filter((i) => i.isActive).length,
    stale,
    expired,
    lastRefreshed: latestRefresh,
    sourceBreakdown,
  };
}

// Get freshness for all modules
export async function getAllModuleFreshness(): Promise<
  Record<string, Awaited<ReturnType<typeof getModuleFreshness>>>
> {
  const modules = await prisma.dynamicContent.findMany({
    select: { module: true },
    distinct: ['module'],
  });

  const result: Record<string, Awaited<ReturnType<typeof getModuleFreshness>>> = {};
  for (const { module } of modules) {
    result[module] = await getModuleFreshness(module);
  }
  return result;
}

// Log a refresh operation
export async function logRefresh(
  module: string,
  refreshType: string,
  status: string,
  stats: {
    itemsChecked?: number;
    itemsUpdated?: number;
    itemsExpired?: number;
    itemsCreated?: number;
    tokensUsed?: number;
    apiCallsMade?: number;
    duration?: number;
    errorMessage?: string;
    details?: unknown;
  }
): Promise<void> {
  await prisma.dataRefreshLog.create({
    data: {
      module,
      refreshType,
      status,
      itemsChecked: stats.itemsChecked || 0,
      itemsUpdated: stats.itemsUpdated || 0,
      itemsExpired: stats.itemsExpired || 0,
      itemsCreated: stats.itemsCreated || 0,
      tokensUsed: stats.tokensUsed,
      apiCallsMade: stats.apiCallsMade,
      duration: stats.duration,
      errorMessage: stats.errorMessage,
      details: stats.details ? JSON.stringify(stats.details) : null,
    },
  });
}

// Delete old refresh logs
export async function pruneRefreshLogs(daysToKeep: number = 30): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  const result = await prisma.dataRefreshLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return result.count;
}
