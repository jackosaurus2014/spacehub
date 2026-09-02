/**
 * @jest-environment node
 */

// Launch imagery gallery (src/lib/gallery.ts): image dedupe grouping, facet
// counts, pagination bounds, and exclusion of rows without a usable image.

jest.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock('../db', () => ({
  __esModule: true,
  default: {
    spaceEvent: { findMany: jest.fn(), findFirst: jest.fn() },
    missionPhoto: { findMany: jest.fn() },
  },
}));

jest.mock('../logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import prisma from '../db';
import {
  buildGalleryPage,
  groupByImage,
  galleryAlt,
  galleryHref,
  getGalleryPage,
  getGalleryItem,
  getLatestGalleryItems,
  isExcludedImageUrl,
  GALLERY_PAGE_SIZE,
  IMAGE_CREDIT,
  type GalleryEventRow,
} from '../gallery';

const findMany = prisma.spaceEvent.findMany as jest.Mock;
const findFirst = prisma.spaceEvent.findFirst as jest.Mock;
const photoFindMany = prisma.missionPhoto.findMany as jest.Mock;

const NOW = new Date('2026-09-02T12:00:00Z');
const F9 = 'https://thespacedevs-prod.nyc3.digitaloceanspaces.com/media/images/falcon_9.jpg';
const ELECTRON = 'https://thespacedevs-prod.nyc3.digitaloceanspaces.com/media/images/electron.jpg';

function row(over: Partial<GalleryEventRow> & { id: string }): GalleryEventRow {
  return {
    name: `Falcon 9 Block 5 | Starlink ${over.id}`,
    mission: `Starlink ${over.id}`,
    rocket: 'Falcon 9 Block 5',
    agency: 'SpaceX',
    location: 'Cape Canaveral SFS, FL, USA',
    country: 'USA',
    launchDate: '2026-08-01T00:00:00Z',
    status: 'completed',
    imageUrl: F9,
    missionPatchUrl: null,
    rocketImageUrl: null,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  photoFindMany.mockResolvedValue([]);
});

describe('isExcludedImageUrl', () => {
  it('rejects null, empty, relative and placeholder URLs', () => {
    expect(isExcludedImageUrl(null)).toBe(true);
    expect(isExcludedImageUrl('')).toBe(true);
    expect(isExcludedImageUrl('/images/x.png')).toBe(true);
    expect(isExcludedImageUrl('https://cdn.example/media/placeholder_1920.png')).toBe(true);
  });
  it('accepts a normal https image', () => {
    expect(isExcludedImageUrl(F9)).toBe(false);
  });
});

describe('groupByImage', () => {
  it('groups identical image URLs under one card with the newest mission primary', () => {
    const rows = [
      row({ id: 'a', launchDate: '2026-08-01T00:00:00Z' }),
      row({ id: 'b', launchDate: '2026-08-10T00:00:00Z' }),
      row({ id: 'c', launchDate: '2026-08-05T00:00:00Z' }),
      row({ id: 'd', imageUrl: ELECTRON, rocket: 'Electron', agency: 'Rocket Lab', launchDate: '2026-07-01T00:00:00Z' }),
    ];
    const items = groupByImage(rows, NOW);
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('b');
    expect(items[0].sharedWith.map((s) => s.id)).toEqual(['c', 'a']);
    expect(items[1].id).toBe('d');
    expect(items[1].sharedWith).toEqual([]);
  });

  it('treats surrounding whitespace as the same image', () => {
    const items = groupByImage([row({ id: 'a' }), row({ id: 'b', imageUrl: ` ${F9} ` })], NOW);
    expect(items).toHaveLength(1);
  });

  it('drops rows whose image is null, blank or a placeholder', () => {
    const items = groupByImage(
      [
        row({ id: 'a' }),
        row({ id: 'nul', imageUrl: null as unknown as string }),
        row({ id: 'blank', imageUrl: '   ' }),
        row({ id: 'ph', imageUrl: 'https://cdn.example/placeholder.png' }),
      ],
      NOW,
    );
    expect(items.map((i) => i.id)).toEqual(['a']);
  });

  it('derives the card fields: title, alt, outcome, rocket slug, hrefs, credit', () => {
    const [item] = groupByImage([row({ id: 'a' })], NOW);
    expect(item.title).toBe('Starlink a');
    expect(item.alt).toBe('Starlink a — Falcon 9 Block 5 at Cape Canaveral SFS, FL, USA, Aug 1, 2026');
    expect(item.outcome).toBe('Launched successfully');
    expect(item.rocketSlug).toBe('falcon-9');
    expect(item.detailHref).toBe('/gallery/a');
    expect(item.launchHref).toBe('/launch/a');
    expect(item.credit).toBe(IMAGE_CREDIT);
    expect(item.year).toBe(2026);
  });
});

describe('buildGalleryPage', () => {
  const rows = [
    ...Array.from({ length: 5 }, (_, i) => row({ id: `f9-${i}`, launchDate: `2026-08-${String(i + 1).padStart(2, '0')}T00:00:00Z` })),
    row({ id: 'e1', imageUrl: ELECTRON, rocket: 'Electron', agency: 'Rocket Lab', launchDate: '2025-12-01T00:00:00Z' }),
    row({ id: 'e2', imageUrl: 'https://x/e2.jpg', rocket: 'Electron', agency: 'Rocket Lab', launchDate: '2025-11-01T00:00:00Z' }),
    row({ id: 'fail', imageUrl: 'https://x/fail.jpg', status: 'failed', launchDate: '2024-03-01T00:00:00Z' }),
  ];

  it('counts facets per card (not per mission) and sorts them', () => {
    const page = buildGalleryPage(rows, {}, NOW);
    expect(page.total).toBe(4);
    // Ties break alphabetically.
    expect(page.facets.providers).toEqual([
      { value: 'Rocket Lab', count: 2 },
      { value: 'SpaceX', count: 2 },
    ]);
    expect(page.facets.rockets).toEqual([
      { value: 'Electron', count: 2 },
      { value: 'Falcon 9 Block 5', count: 2 },
    ]);
    expect(page.facets.years).toEqual([
      { value: '2026', count: 1 },
      { value: '2025', count: 2 },
      { value: '2024', count: 1 },
    ]);
  });

  it('filters by provider, rocket and year while facets stay global', () => {
    const byProvider = buildGalleryPage(rows, { provider: 'Rocket Lab' }, NOW);
    expect(byProvider.items.map((i) => i.id)).toEqual(['e1', 'e2']);
    expect(byProvider.facets.providers).toHaveLength(2);

    const byRocket = buildGalleryPage(rows, { rocket: 'Falcon 9 Block 5' }, NOW);
    expect(byRocket.items.map((i) => i.id)).toEqual(['f9-4', 'fail']);

    const byYear = buildGalleryPage(rows, { year: 2024 }, NOW);
    expect(byYear.items.map((i) => i.id)).toEqual(['fail']);
    expect(byYear.items[0].outcome).toBe('Launch failure');

    const none = buildGalleryPage(rows, { provider: 'NASA' }, NOW);
    expect(none.items).toEqual([]);
    expect(none.total).toBe(0);
    expect(none.totalPages).toBe(1);
  });

  it('paginates 48 per page and clamps out-of-range pages', () => {
    const many = Array.from({ length: 101 }, (_, i) =>
      row({ id: `m${i}`, imageUrl: `https://x/${i}.jpg`, launchDate: new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString() }),
    );
    const p1 = buildGalleryPage(many, { page: 1 }, NOW);
    expect(p1.items).toHaveLength(GALLERY_PAGE_SIZE);
    expect(p1.totalPages).toBe(3);
    expect(p1.hasPrev).toBe(false);
    expect(p1.hasNext).toBe(true);
    expect(p1.items[0].id).toBe('m100');

    const p3 = buildGalleryPage(many, { page: 3 }, NOW);
    expect(p3.items).toHaveLength(5);
    expect(p3.hasNext).toBe(false);
    expect(p3.hasPrev).toBe(true);

    expect(buildGalleryPage(many, { page: 0 }, NOW).page).toBe(1);
    expect(buildGalleryPage(many, { page: -4 }, NOW).page).toBe(1);
    expect(buildGalleryPage(many, { page: Number.NaN }, NOW).page).toBe(1);
    const beyond = buildGalleryPage(many, { page: 99 }, NOW);
    expect(beyond.page).toBe(3);
    expect(beyond.items).toHaveLength(5);
  });
});

describe('getGalleryPage', () => {
  it('queries eligible rows only and merges approved curated photos in front of page 1', async () => {
    findMany.mockResolvedValue([
      { ...row({ id: 'a' }), launchDate: new Date('2026-08-01T00:00:00Z') },
    ]);
    photoFindMany.mockResolvedValue([
      {
        id: 'p1', missionName: 'Crew-12', eventId: 'a', title: 'Crew-12 pad shot', description: null,
        photoUrl: 'https://x/crew12.jpg', credit: 'NASA/Joel Kowsky', creditUrl: null,
        takenAt: new Date('2026-08-02T00:00:00Z'), createdAt: new Date('2026-08-02T00:00:00Z'),
      },
    ]);
    const page = await getGalleryPage({ page: 1 });
    const where = findMany.mock.calls[0][0].where;
    expect(where.imageUrl).toEqual({ not: null });
    expect(where.rocket).toEqual({ not: null });
    expect(where.OR[0].status.in).toEqual(['completed', 'failed']);
    expect(page.items.map((i) => i.id)).toEqual(['photo-p1', 'a']);
    expect(page.items[0].source).toBe('curated');
    expect(page.items[0].credit).toBe('Image: NASA/Joel Kowsky');
    expect(page.items[0].detailHref).toBeNull();
    expect(page.items[0].launchHref).toBe('/launch/a');
    // Curated garnish never counts toward the paged total.
    expect(page.total).toBe(1);
    expect(typeof page.generatedAt).toBe('string');
  });

  it('does not prepend curated photos on filtered or later pages', async () => {
    findMany.mockResolvedValue([{ ...row({ id: 'a' }), launchDate: new Date('2026-08-01T00:00:00Z') }]);
    photoFindMany.mockResolvedValue([
      { id: 'p1', missionName: 'x', eventId: null, title: 't', description: null, photoUrl: 'https://x/p.jpg', credit: null, creditUrl: null, takenAt: null, createdAt: new Date() },
    ]);
    const filtered = await getGalleryPage({ provider: 'SpaceX' });
    expect(filtered.items.map((i) => i.id)).toEqual(['a']);
  });

  it('fails soft to an empty page on a database error', async () => {
    findMany.mockRejectedValue(new Error('db down'));
    const page = await getGalleryPage({ page: 2 });
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.hasNext).toBe(false);
  });
});

describe('getLatestGalleryItems', () => {
  it('returns the newest deduped cards', async () => {
    findMany.mockResolvedValue([
      { ...row({ id: 'a' }), launchDate: new Date('2026-08-01T00:00:00Z') },
      { ...row({ id: 'b' }), launchDate: new Date('2026-08-09T00:00:00Z') },
      { ...row({ id: 'c', imageUrl: ELECTRON }), launchDate: new Date('2026-07-01T00:00:00Z') },
    ]);
    const items = await getLatestGalleryItems(6);
    expect(items.map((i) => i.id)).toEqual(['b', 'c']);
  });
});

describe('getGalleryItem', () => {
  it('returns null when the event has no image', async () => {
    findFirst.mockResolvedValueOnce(null);
    expect(await getGalleryItem('nope')).toBeNull();
    expect(findFirst.mock.calls[0][0].where).toEqual({ id: 'nope', imageUrl: { not: null }, rocket: { not: null } });
  });

  it('assembles shared missions and prev/next neighbours', async () => {
    findFirst
      .mockResolvedValueOnce({ ...row({ id: 'b' }), launchDate: new Date('2026-08-10T00:00:00Z'), description: 'Batch 10', infoUrl: null })
      .mockResolvedValueOnce({ ...row({ id: 'a' }), launchDate: new Date('2026-08-01T00:00:00Z') })
      .mockResolvedValueOnce({ ...row({ id: 'c' }), launchDate: new Date('2026-08-20T00:00:00Z') });
    findMany.mockResolvedValueOnce([{ ...row({ id: 'a' }), launchDate: new Date('2026-08-01T00:00:00Z') }]);
    const item = await getGalleryItem('b');
    expect(item?.id).toBe('b');
    expect(item?.description).toBe('Batch 10');
    expect(item?.sharedWith.map((s) => s.id)).toEqual(['a']);
    expect(item?.prev?.id).toBe('a');
    expect(item?.next?.id).toBe('c');
    expect(item?.launchDate).toBe('2026-08-10T00:00:00.000Z');
  });
});

describe('helpers', () => {
  it('galleryAlt degrades gracefully without rocket or site', () => {
    expect(galleryAlt({ name: 'Ariane 6 | Galileo L14', rocket: null, location: null, launchDate: null })).toBe('Galileo L14 — Date TBD');
  });
  it('galleryHref encodes filters and omits page 1', () => {
    expect(galleryHref({})).toBe('/gallery');
    expect(galleryHref({ provider: 'Rocket Lab', year: 2025, page: 1 })).toBe('/gallery?provider=Rocket+Lab&year=2025');
    expect(galleryHref({ rocket: 'Falcon 9 Block 5', page: 3 })).toBe('/gallery?rocket=Falcon+9+Block+5&page=3');
  });
});
