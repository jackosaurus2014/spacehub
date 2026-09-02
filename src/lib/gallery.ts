// Launch imagery gallery (2026-09-02) — built entirely from data we already
// ingest. Every SpaceEvent synced from Launch Library 2 carries `imageUrl`
// (LL2 `launch.image || launch.infographic`), `rocketImageUrl` and
// `missionPatchUrl` (src/lib/events-fetcher.ts launchToEventData). No crowd
// content is needed; the curated MissionPhoto table (~0 rows) is merged in
// front of page 1 only when it has approved rows.
//
// Credit: we fetch LL2 v2.2.0, where `image` is a plain URL string with no
// credit/license object, so no per-image credit is invented — every LL2
// image carries the generic IMAGE_CREDIT line.
//
// Image hosts: LL2 serves from *.nyc3.digitaloceanspaces.com, which is NOT in
// next.config.js images.remotePatterns. The gallery therefore renders with
// next/image `unoptimized` (the pattern MissionControlClient already uses for
// LL2 images) — see src/components/gallery/GalleryImage.tsx.

import { unstable_cache } from 'next/cache';
import prisma from './db';
import { logger } from './logger';
import { rocketSlugForName } from './rocket-registry';

export const GALLERY_PAGE_SIZE = 48;
export const GALLERY_UPCOMING_WINDOW_DAYS = 30;
export const GALLERY_CACHE_SECONDS = 600;
/** Generic credit line — we do not receive per-image credits from LL2 2.2.0. */
export const IMAGE_CREDIT = 'Image: Launch Library 2 / provider media';
/** Rows loaded per pass; two years of launches is well under this. */
const MAX_ROWS = 5000;

const LAUNCHED_STATUSES = ['completed', 'failed'] as const;
const UPCOMING_STATUSES = ['upcoming', 'go', 'tbd', 'tbc', 'in_progress'] as const;

/** Placeholder / generic image URLs never worth a card. Empty so far: neither
 *  events-fetcher.ts nor mission-stream.ts identifies a placeholder image
 *  URL (grep 'placeholder' — only stream placeholders). Add patterns here
 *  if one turns up. */
export const EXCLUDED_IMAGE_PATTERNS: RegExp[] = [/\/placeholder[^/]*\.(png|jpe?g|webp|svg)$/i];

export function isExcludedImageUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return true;
  return EXCLUDED_IMAGE_PATTERNS.some((re) => re.test(trimmed));
}

export interface GalleryMissionRef {
  id: string;
  name: string;
  mission: string | null;
  /** ISO string or null. */
  launchDate: string | null;
  status: string;
}

export interface GalleryItem {
  /** Event id of the primary (most recent) mission for this image. */
  id: string;
  imageUrl: string;
  name: string;
  /** Mission title without the "Rocket | " prefix LL2 puts on launch names. */
  title: string;
  mission: string | null;
  rocket: string | null;
  rocketSlug: string | null;
  agency: string | null;
  location: string | null;
  country: string | null;
  /** ISO string or null. */
  launchDate: string | null;
  status: string;
  outcome: string;
  year: number | null;
  missionPatchUrl: string | null;
  rocketImageUrl: string | null;
  /** Other missions that share the identical image URL (LL2 reuses provider stock images). */
  sharedWith: GalleryMissionRef[];
  /** Accessible description: "<mission> — <rocket> at <site>, <date>". */
  alt: string;
  credit: string;
  creditUrl: string | null;
  source: 'll2' | 'curated';
  /** Detail page, or null for curated photos without an event. */
  detailHref: string | null;
  /** Launch-day page, or null for curated photos without an event. */
  launchHref: string | null;
}

export interface GalleryFacet {
  value: string;
  count: number;
}

export interface GalleryFilters {
  provider: string | null;
  rocket: string | null;
  year: number | null;
}

export interface GalleryPage {
  items: GalleryItem[];
  page: number;
  pageSize: number;
  /** Number of cards (deduped images) matching the filters. */
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  facets: {
    providers: GalleryFacet[];
    rockets: GalleryFacet[];
    years: GalleryFacet[];
  };
  filters: GalleryFilters;
  /** ISO string. */
  generatedAt: string;
}

export interface GalleryItemDetail extends GalleryItem {
  description: string | null;
  infoUrl: string | null;
  prev: GalleryMissionRef | null;
  next: GalleryMissionRef | null;
}

interface EventRow {
  id: string;
  name: string;
  mission: string | null;
  rocket: string | null;
  agency: string | null;
  location: string | null;
  country: string | null;
  launchDate: string | null;
  status: string;
  imageUrl: string;
  missionPatchUrl: string | null;
  rocketImageUrl: string | null;
}

const ROW_SELECT = {
  id: true,
  name: true,
  mission: true,
  rocket: true,
  agency: true,
  location: true,
  country: true,
  launchDate: true,
  status: true,
  imageUrl: true,
  missionPatchUrl: true,
  rocketImageUrl: true,
} as const;

/** Eligibility: a launch (rocket known) with an image, either flown or
 *  upcoming within the window. Scrubbed/stale rows are not shown. */
function eligibleWhere(now: Date) {
  const windowEnd = new Date(now.getTime() + GALLERY_UPCOMING_WINDOW_DAYS * 86_400_000);
  const windowStart = new Date(now.getTime() - 86_400_000);
  return {
    imageUrl: { not: null },
    rocket: { not: null },
    OR: [
      { status: { in: [...LAUNCHED_STATUSES] } },
      { status: { in: [...UPCOMING_STATUSES] }, launchDate: { gte: windowStart, lte: windowEnd } },
    ],
  };
}

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Strip the "Rocket | " prefix LL2 puts on launch names. */
export function galleryTitle(name: string): string {
  const i = name.indexOf(' | ');
  return i > 0 ? name.slice(i + 3) : name;
}

export function outcomeLabel(status: string, launchDate: string | null, now = new Date()): string {
  switch (status) {
    case 'completed':
      return 'Launched successfully';
    case 'failed':
      return 'Launch failure';
    case 'in_progress':
      return 'In flight';
    case 'go':
      return 'Go for launch';
    case 'tbd':
    case 'tbc':
      return 'Date to be confirmed';
    case 'scrubbed':
      return 'Scrubbed';
    default:
      return launchDate && new Date(launchDate).getTime() < now.getTime() ? 'Launched' : 'Upcoming';
  }
}

export function formatGalleryDate(iso: string | null, withTime = false): string {
  if (!iso) return 'Date TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Date TBD';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  if (!withTime) return date;
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  return `${date}, ${time} UTC`;
}

/** "<mission> — <rocket> at <site>, <date>" */
export function galleryAlt(row: { name: string; rocket: string | null; location: string | null; launchDate: string | null }): string {
  const title = galleryTitle(row.name);
  const parts: string[] = [];
  if (row.rocket) parts.push(row.rocket);
  if (row.location) parts.push(parts.length ? `at ${row.location}` : row.location);
  const tail = [parts.join(' '), formatGalleryDate(row.launchDate)].filter(Boolean).join(', ');
  return tail ? `${title} — ${tail}` : title;
}

function yearOf(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

function normalizeRow(r: {
  id: string;
  name: string;
  mission: string | null;
  rocket: string | null;
  agency: string | null;
  location: string | null;
  country: string | null;
  launchDate: Date | string | null;
  status: string;
  imageUrl: string | null;
  missionPatchUrl: string | null;
  rocketImageUrl: string | null;
}): EventRow {
  return {
    id: r.id,
    name: r.name,
    mission: r.mission,
    rocket: r.rocket,
    agency: r.agency,
    location: r.location,
    country: r.country,
    launchDate: toIso(r.launchDate),
    status: r.status,
    imageUrl: (r.imageUrl ?? '').trim(),
    missionPatchUrl: r.missionPatchUrl,
    rocketImageUrl: r.rocketImageUrl,
  };
}

function refOf(r: EventRow): GalleryMissionRef {
  return { id: r.id, name: galleryTitle(r.name), mission: r.mission, launchDate: r.launchDate, status: r.status };
}

function itemFromRows(primary: EventRow, others: EventRow[], now: Date): GalleryItem {
  return {
    id: primary.id,
    imageUrl: primary.imageUrl,
    name: primary.name,
    title: galleryTitle(primary.name),
    mission: primary.mission,
    rocket: primary.rocket,
    rocketSlug: rocketSlugForName(primary.rocket),
    agency: primary.agency,
    location: primary.location,
    country: primary.country,
    launchDate: primary.launchDate,
    status: primary.status,
    outcome: outcomeLabel(primary.status, primary.launchDate, now),
    year: yearOf(primary.launchDate),
    missionPatchUrl: primary.missionPatchUrl,
    rocketImageUrl: primary.rocketImageUrl,
    sharedWith: others.map(refOf),
    alt: galleryAlt(primary),
    credit: IMAGE_CREDIT,
    creditUrl: null,
    source: 'll2',
    detailHref: `/gallery/${primary.id}`,
    launchHref: `/launch/${primary.id}`,
  };
}

/** Rows ordered by launchDate desc (nulls last). */
function sortRows(rows: EventRow[]): EventRow[] {
  return [...rows].sort((a, b) => {
    const ta = a.launchDate ? new Date(a.launchDate).getTime() : -Infinity;
    const tb = b.launchDate ? new Date(b.launchDate).getTime() : -Infinity;
    if (ta !== tb) return tb - ta;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Group rows sharing an identical imageUrl into one card. LL2 reuses provider
 * stock images heavily (every Starlink flight of a block carries the same
 * Falcon 9 photo), so without this the gallery is forty copies of one image.
 * The most recent mission is the card's primary; the rest are listed on it.
 */
export function groupByImage(rows: EventRow[], now = new Date()): GalleryItem[] {
  const sorted = sortRows(
    rows
      .map((r) => ({ ...r, imageUrl: (r.imageUrl ?? '').trim() }))
      .filter((r) => !isExcludedImageUrl(r.imageUrl)),
  );
  const groups = new Map<string, EventRow[]>();
  for (const row of sorted) {
    const list = groups.get(row.imageUrl);
    if (list) list.push(row);
    else groups.set(row.imageUrl, [row]);
  }
  const items: GalleryItem[] = [];
  for (const list of groups.values()) {
    const [primary, ...others] = list;
    items.push(itemFromRows(primary, others, now));
  }
  return items;
}

function itemMatches(item: GalleryItem, filters: GalleryFilters, rowsById: Map<string, EventRow>): boolean {
  const members = [rowsById.get(item.id), ...item.sharedWith.map((s) => rowsById.get(s.id))].filter(Boolean) as EventRow[];
  if (filters.provider && !members.some((m) => m.agency === filters.provider)) return false;
  if (filters.rocket && !members.some((m) => m.rocket === filters.rocket)) return false;
  if (filters.year !== null && !members.some((m) => yearOf(m.launchDate) === filters.year)) return false;
  return true;
}

function countFacet(items: GalleryItem[], rowsById: Map<string, EventRow>, pick: (r: EventRow) => string | null): GalleryFacet[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const members = [rowsById.get(item.id), ...item.sharedWith.map((s) => rowsById.get(s.id))].filter(Boolean) as EventRow[];
    const values = new Set<string>();
    for (const m of members) {
      const v = pick(m);
      if (v) values.add(v);
    }
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** Pure page builder over already-loaded rows — the unit under test. */
export function buildGalleryPage(
  rows: EventRow[],
  opts: { provider?: string | null; rocket?: string | null; year?: number | null; page?: number },
  now = new Date(),
): Omit<GalleryPage, 'generatedAt'> {
  const filters: GalleryFilters = {
    provider: opts.provider?.trim() || null,
    rocket: opts.rocket?.trim() || null,
    year: typeof opts.year === 'number' && Number.isFinite(opts.year) ? opts.year : null,
  };
  const rowsById = new Map(rows.map((r) => [r.id, r]));
  const all = groupByImage(rows, now);
  const matching = all.filter((item) => itemMatches(item, filters, rowsById));

  const total = matching.length;
  const totalPages = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE));
  const requested = Number.isFinite(opts.page) && (opts.page as number) >= 1 ? Math.floor(opts.page as number) : 1;
  const page = Math.min(requested, totalPages);
  const start = (page - 1) * GALLERY_PAGE_SIZE;

  return {
    items: matching.slice(start, start + GALLERY_PAGE_SIZE),
    page,
    pageSize: GALLERY_PAGE_SIZE,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    facets: {
      providers: countFacet(all, rowsById, (r) => r.agency),
      rockets: countFacet(all, rowsById, (r) => r.rocket),
      years: countFacet(all, rowsById, (r) => (yearOf(r.launchDate) === null ? null : String(yearOf(r.launchDate)))).sort(
        (a, b) => Number(b.value) - Number(a.value),
      ),
    },
    filters,
  };
}

/** All eligible rows, cached. One key for every filter combination — the
 *  filtering and paging are cheap in-process work over a few thousand rows. */
const loadEligibleRows = unstable_cache(
  async (): Promise<EventRow[]> => {
    const now = new Date();
    const rows = await prisma.spaceEvent.findMany({
      where: eligibleWhere(now),
      select: ROW_SELECT,
      orderBy: [{ launchDate: 'desc' }],
      take: MAX_ROWS,
    });
    return rows.map(normalizeRow);
  },
  ['gallery-eligible-rows'],
  { revalidate: GALLERY_CACHE_SECONDS },
);

/** Approved curated MissionPhoto rows as gallery items (front of page 1). */
const loadCuratedItems = unstable_cache(
  async (): Promise<GalleryItem[]> => {
    try {
      const photos = await prisma.missionPhoto.findMany({
        where: { approved: true },
        orderBy: [{ featured: 'desc' }, { takenAt: 'desc' }, { createdAt: 'desc' }],
        take: 24,
        select: {
          id: true,
          missionName: true,
          eventId: true,
          title: true,
          description: true,
          photoUrl: true,
          credit: true,
          creditUrl: true,
          takenAt: true,
          createdAt: true,
        },
      });
      const now = new Date();
      return photos
        .filter((p) => !isExcludedImageUrl(p.photoUrl))
        .map((p) => {
          const takenAt = toIso(p.takenAt);
          return {
            id: `photo-${p.id}`,
            imageUrl: p.photoUrl,
            name: p.title,
            title: p.title,
            mission: p.missionName,
            rocket: null,
            rocketSlug: null,
            agency: null,
            location: null,
            country: null,
            launchDate: takenAt,
            status: 'completed',
            outcome: outcomeLabel('completed', takenAt, now),
            year: yearOf(takenAt),
            missionPatchUrl: null,
            rocketImageUrl: null,
            sharedWith: [],
            alt: p.description ? `${p.title} — ${p.description.slice(0, 120)}` : p.title,
            credit: p.credit ? `Image: ${p.credit}` : 'Image: SpaceNexus community',
            creditUrl: p.creditUrl ?? null,
            source: 'curated' as const,
            detailHref: null,
            launchHref: p.eventId ? `/launch/${p.eventId}` : null,
          };
        });
    } catch (error) {
      // MissionPhoto is optional garnish — never let it take the gallery down.
      logger.warn('gallery: curated photo load failed', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  },
  ['gallery-curated-items'],
  { revalidate: GALLERY_CACHE_SECONDS },
);

export async function getGalleryPage(opts: {
  provider?: string | null;
  rocket?: string | null;
  year?: number | null;
  page?: number;
}): Promise<GalleryPage> {
  const now = new Date();
  try {
    const rows = await loadEligibleRows();
    const built = buildGalleryPage(rows, opts, now);
    const unfiltered = !built.filters.provider && !built.filters.rocket && built.filters.year === null;
    if (unfiltered && built.page === 1) {
      const curated = await loadCuratedItems();
      if (curated.length > 0) built.items = [...curated, ...built.items];
    }
    return { ...built, generatedAt: now.toISOString() };
  } catch (error) {
    logger.error('gallery: page load failed', { error: error instanceof Error ? error.message : String(error) });
    return {
      items: [],
      page: 1,
      pageSize: GALLERY_PAGE_SIZE,
      total: 0,
      totalPages: 1,
      hasPrev: false,
      hasNext: false,
      facets: { providers: [], rockets: [], years: [] },
      filters: { provider: opts.provider?.trim() || null, rocket: opts.rocket?.trim() || null, year: opts.year ?? null },
      generatedAt: now.toISOString(),
    };
  }
}

/** Latest N cards with images — the Mission Control thumbnail strip. */
export async function getLatestGalleryItems(limit = 6): Promise<GalleryItem[]> {
  try {
    const rows = await loadEligibleRows();
    return groupByImage(rows).slice(0, Math.max(0, limit));
  } catch (error) {
    logger.warn('gallery: latest items failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * One event's card, with the missions sharing its image and prev/next by
 * launch date across the eligible set. Any SpaceEvent with an image and a
 * rocket resolves (not only the 30-day window) so a deep link never 404s
 * while the launch page itself still renders; the exists route mirrors
 * exactly this gate.
 */
export const getGalleryItem = unstable_cache(
  async (eventId: string): Promise<GalleryItemDetail | null> => {
    const now = new Date();
    const event = await prisma.spaceEvent.findFirst({
      where: { id: eventId, imageUrl: { not: null }, rocket: { not: null } },
      select: { ...ROW_SELECT, description: true, infoUrl: true },
    });
    if (!event || isExcludedImageUrl(event.imageUrl)) return null;
    const row = normalizeRow(event);

    const [shared, prevRow, nextRow] = await Promise.all([
      prisma.spaceEvent.findMany({
        where: { imageUrl: event.imageUrl, id: { not: event.id }, rocket: { not: null } },
        select: ROW_SELECT,
        orderBy: [{ launchDate: 'desc' }],
        take: 50,
      }),
      event.launchDate
        ? prisma.spaceEvent.findFirst({
            where: { ...eligibleWhere(now), id: { not: event.id }, launchDate: { lt: event.launchDate } },
            select: ROW_SELECT,
            orderBy: [{ launchDate: 'desc' }],
          })
        : null,
      event.launchDate
        ? prisma.spaceEvent.findFirst({
            where: { ...eligibleWhere(now), id: { not: event.id }, launchDate: { gt: event.launchDate } },
            select: ROW_SELECT,
            orderBy: [{ launchDate: 'asc' }],
          })
        : null,
    ]);

    const item = itemFromRows(row, shared.map(normalizeRow), now);
    return {
      ...item,
      description: event.description ?? null,
      infoUrl: event.infoUrl ?? null,
      prev: prevRow ? refOf(normalizeRow(prevRow)) : null,
      next: nextRow ? refOf(normalizeRow(nextRow)) : null,
    };
  },
  ['gallery-item'],
  { revalidate: GALLERY_CACHE_SECONDS },
);

/** Event ids for the sitemap: latest flown launches with an image. */
export async function getGallerySitemapIds(limit = 200): Promise<Array<{ id: string; updatedAt: Date; launchDate: Date | null }>> {
  return prisma.spaceEvent.findMany({
    where: { imageUrl: { not: null }, rocket: { not: null }, status: { in: [...LAUNCHED_STATUSES] } },
    select: { id: true, updatedAt: true, launchDate: true },
    orderBy: [{ launchDate: 'desc' }],
    take: limit,
  });
}

/** Build the /gallery URL for a filter set (page 1 unless given). */
export function galleryHref(filters: Partial<GalleryFilters> & { page?: number }): string {
  const params = new URLSearchParams();
  if (filters.provider) params.set('provider', filters.provider);
  if (filters.rocket) params.set('rocket', filters.rocket);
  if (filters.year !== null && filters.year !== undefined) params.set('year', String(filters.year));
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  const qs = params.toString();
  return qs ? `/gallery?${qs}` : '/gallery';
}

export type { EventRow as GalleryEventRow };
