/**
 * @jest-environment node
 */
/**
 * Forum discussion anchors — the cold-start mechanism.
 *
 * The forum was mothballed for being empty; anchors are the reason it is back
 * on the air. These pin the parts that would quietly rot: that an anchor
 * never fabricates a person, that opening one twice does not leave two
 * threads behind, that a slipped launch updates rather than duplicates, and
 * that launch dates are formatted at the precision the feed actually gave us.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    forumAnchor: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    forumCategory: { findUnique: jest.fn(), count: jest.fn(), create: jest.fn(), upsert: jest.fn() },
    forumThread: { create: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    spaceEvent: { findMany: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import prisma from '@/lib/db';
import {
  ensureAnchor,
  anchorOpeningPost,
  anchorThreadTitle,
  anchorThreadPath,
  isAnchorType,
  getForumSystemUserId,
  __resetForumSystemUserCache,
  FORUM_SYSTEM_EMAIL,
  FORUM_SYSTEM_NAME,
  ANCHOR_CATEGORY,
  type AnchorSubject,
} from '../forum-anchors';
import {
  formatLaunchWhen,
  launchSubject,
  syncLaunchAnchors,
  ensureForumCategories,
} from '../forum-anchor-sync';
import { FORUM_CATEGORY_SEEDS } from '../forum-categories';
import { FORUM_TAGS } from '../validations';
import { ANCHOR_TAGS, ANCHOR_TYPES } from '../forum-anchors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const LAUNCH: AnchorSubject = {
  anchorType: 'launch',
  anchorKey: 'evt_1',
  title: 'Falcon 9 | Starlink 12-5',
  url: 'https://spacenexus.us/launch/evt_1',
  subtitle: 'Mission: Starlink rideshare.',
  facts: { Vehicle: 'Falcon 9', Pad: 'SLC-40', 'T-0': 'Sep 20, 2026' },
  subjectDate: new Date('2026-09-20T10:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetForumSystemUserCache();
});

describe('the platform author', () => {
  it('reuses the reserved account rather than making a new one', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'sys_1' });
    expect(await getForumSystemUserId()).toBe('sys_1');
    expect(db.user.create).not.toHaveBeenCalled();
    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: FORUM_SYSTEM_EMAIL } })
    );
  });

  it('creates it with an UNUSABLE password and no admin rights', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ id: 'sys_2' });

    await getForumSystemUserId();

    const data = db.user.create.mock.calls[0][0].data;
    expect(data.email).toBe(FORUM_SYSTEM_EMAIL);
    expect(data.name).toBe(FORUM_SYSTEM_NAME);
    // This test used to assert NO password at all. That was the intent, but
    // User.password is not nullable, so every run of the anchor cron threw
    // "Argument `password` is missing" and no launch thread was ever created —
    // the forum sat empty while its own page promised otherwise. An `as never`
    // cast had hidden the missing field from the compiler.
    //
    // So the account now stores a real bcrypt hash of a random secret that is
    // discarded immediately. The credentials provider compares against it
    // normally and can never match, because nobody knows the plaintext. A
    // sentinel string would be worse: some bcrypt implementations throw on a
    // malformed hash rather than returning false.
    expect(typeof data.password).toBe('string');
    expect(data.password).toMatch(/^\$2[aby]\$/);
    expect(data.isAdmin).toBe(false);
  });

  it('never reuses the same unusable password twice', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ id: 'sys_3' });
    await getForumSystemUserId();
    const first = db.user.create.mock.calls[0][0].data.password;

    // The id is memoised, so the cache has to be cleared or the second
    // call never reaches user.create at all.
    jest.clearAllMocks();
    __resetForumSystemUserCache();
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ id: 'sys_4' });
    await getForumSystemUserId();
    const second = db.user.create.mock.calls[0][0].data.password;

    expect(second).not.toBe(first);
  });

  it('caches the lookup', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'sys_3' });
    await getForumSystemUserId();
    await getForumSystemUserId();
    expect(db.user.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe('anchorOpeningPost', () => {
  const body = anchorOpeningPost(LAUNCH);

  it('says plainly that the platform opened it', () => {
    expect(body).toContain('SpaceNexus opened it automatically');
  });

  it('never claims anyone has said anything', () => {
    // The hard line: structure is honest, invented community members are not.
    expect(body).not.toMatch(/\b(said|wrote|commented|posted that|according to one)\b/i);
  });

  it('carries the subject facts, so an empty thread still shows the launch', () => {
    expect(body).toContain('Falcon 9');
    expect(body).toContain('SLC-40');
    expect(body).toContain('Sep 20, 2026');
  });

  it('links to the subject page', () => {
    expect(body).toContain('https://spacenexus.us/launch/evt_1');
  });

  it('asks open questions rather than stating the platform opinion', () => {
    expect(body).toContain('Worth discussing');
    expect(body).toContain('?');
  });
});

describe('anchor metadata', () => {
  it('titles each kind distinctly', () => {
    expect(anchorThreadTitle(LAUNCH)).toBe('Launch discussion: Falcon 9 | Starlink 12-5');
    expect(anchorThreadTitle({ ...LAUNCH, anchorType: 'company', title: 'Rocket Lab' })).toBe(
      'Rocket Lab — company discussion'
    );
  });

  it('keeps titles inside the 200-character column bound', () => {
    expect(anchorThreadTitle({ ...LAUNCH, title: 'x'.repeat(400) }).length).toBeLessThanOrEqual(200);
  });

  it('builds the thread path', () => {
    expect(anchorThreadPath({ categorySlug: 'launch-tech', threadId: 't1' })).toBe(
      '/community/forums/launch-tech/t1'
    );
  });

  it('guards the anchor type', () => {
    expect(isAnchorType('launch')).toBe(true);
    expect(isAnchorType('nonsense')).toBe(false);
  });

  it('only files anchors into categories that the seeder actually creates', () => {
    const seeded = [
      'launch-tech', 'satellite-ops', 'space-policy', 'business-funding',
      'deep-space', 'careers', 'general', 'announcements',
    ];
    for (const type of ANCHOR_TYPES) {
      expect(seeded).toContain(ANCHOR_CATEGORY[type]);
    }
  });

  it('only uses tags the thread-tag schema accepts', () => {
    for (const type of ANCHOR_TYPES) {
      for (const tag of ANCHOR_TAGS[type]) {
        expect(FORUM_TAGS as readonly string[]).toContain(tag);
      }
    }
  });
});

describe('ensureAnchor', () => {
  it('returns the existing anchor without creating a second thread', async () => {
    db.forumAnchor.findUnique.mockResolvedValue({
      id: 'a1', anchorType: 'launch', anchorKey: 'evt_1', threadId: 't1',
      categorySlug: 'launch-tech', subjectTitle: 'x', subjectUrl: 'u',
      subtitle: null, facts: null, subjectDate: null, retiredAt: null,
    });

    const res = await ensureAnchor(LAUNCH);
    expect(res?.created).toBe(false);
    expect(db.forumThread.create).not.toHaveBeenCalled();
  });

  it('does nothing when the category does not exist — no orphan thread', async () => {
    db.forumAnchor.findUnique.mockResolvedValue(null);
    db.forumCategory.findUnique.mockResolvedValue(null);

    expect(await ensureAnchor(LAUNCH)).toBeNull();
    expect(db.forumThread.create).not.toHaveBeenCalled();
  });

  it('opens a thread authored by the platform account', async () => {
    db.forumAnchor.findUnique.mockResolvedValue(null);
    db.forumCategory.findUnique.mockResolvedValue({ id: 'cat_1' });
    db.user.findUnique.mockResolvedValue({ id: 'sys_1' });
    db.forumThread.create.mockResolvedValue({ id: 't_new' });
    db.forumAnchor.create.mockResolvedValue({
      id: 'a1', anchorType: 'launch', anchorKey: 'evt_1', threadId: 't_new',
      categorySlug: 'launch-tech', subjectTitle: LAUNCH.title, subjectUrl: LAUNCH.url,
      subtitle: LAUNCH.subtitle, facts: LAUNCH.facts, subjectDate: LAUNCH.subjectDate,
      retiredAt: null,
    });

    const res = await ensureAnchor(LAUNCH);
    expect(res?.created).toBe(true);
    expect(db.forumThread.create.mock.calls[0][0].data.authorId).toBe('sys_1');
    expect(db.forumThread.create.mock.calls[0][0].data.categoryId).toBe('cat_1');
  });

  it('creates no posts — an anchored thread starts with zero replies', async () => {
    db.forumAnchor.findUnique.mockResolvedValue(null);
    db.forumCategory.findUnique.mockResolvedValue({ id: 'cat_1' });
    db.user.findUnique.mockResolvedValue({ id: 'sys_1' });
    db.forumThread.create.mockResolvedValue({ id: 't_new' });
    db.forumAnchor.create.mockResolvedValue({
      id: 'a1', anchorType: 'launch', anchorKey: 'evt_1', threadId: 't_new',
      categorySlug: 'launch-tech', subjectTitle: 'x', subjectUrl: 'u',
      subtitle: null, facts: null, subjectDate: null, retiredAt: null,
    });

    await ensureAnchor(LAUNCH);
    // There is no forumPost.create in the mock at all; if the implementation
    // ever seeds a fake reply this test file will throw rather than pass.
    expect((db as Record<string, unknown>).forumPost).toBeUndefined();
  });

  it('loses a creation race cleanly: deletes its thread, returns the winner', async () => {
    db.forumAnchor.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'a_winner', anchorType: 'launch', anchorKey: 'evt_1', threadId: 't_winner',
        categorySlug: 'launch-tech', subjectTitle: 'x', subjectUrl: 'u',
        subtitle: null, facts: null, subjectDate: null, retiredAt: null,
      });
    db.forumCategory.findUnique.mockResolvedValue({ id: 'cat_1' });
    db.user.findUnique.mockResolvedValue({ id: 'sys_1' });
    db.forumThread.create.mockResolvedValue({ id: 't_loser' });
    db.forumAnchor.create.mockRejectedValue(new Error('unique constraint'));
    db.forumThread.delete.mockResolvedValue({});

    const res = await ensureAnchor(LAUNCH);

    expect(res?.created).toBe(false);
    expect(res?.anchor.threadId).toBe('t_winner');
    expect(db.forumThread.delete).toHaveBeenCalledWith({ where: { id: 't_loser' } });
  });
});

describe('ensureForumCategories', () => {
  it('does nothing once the full set exists', async () => {
    db.forumCategory.count.mockResolvedValue(FORUM_CATEGORY_SEEDS.length);
    expect(await ensureForumCategories()).toBe(0);
    expect(db.forumCategory.upsert).not.toHaveBeenCalled();
  });

  it('seeds a fresh database so the cron can file anchors at all', async () => {
    db.forumCategory.count.mockResolvedValue(0);
    db.forumCategory.findUnique.mockResolvedValue(null);
    db.forumCategory.upsert.mockResolvedValue({ id: 'c' });

    expect(await ensureForumCategories()).toBe(FORUM_CATEGORY_SEEDS.length);
  });

  it('never overwrites a category an operator has reworded', async () => {
    db.forumCategory.count.mockResolvedValue(1);
    db.forumCategory.findUnique.mockImplementation(({ where }: { where: { slug: string } }) =>
      Promise.resolve(where.slug === 'general' ? { id: 'existing' } : null)
    );
    db.forumCategory.upsert.mockResolvedValue({ id: 'c' });

    await ensureForumCategories();

    const createdSlugs = db.forumCategory.upsert.mock.calls.map(
      (c: [{ create: { slug: string } }]) => c[0].create.slug
    );
    expect(createdSlugs).not.toContain('general');
    expect(createdSlugs).toHaveLength(FORUM_CATEGORY_SEEDS.length - 1);
  });
});

describe('formatLaunchWhen', () => {
  const d = new Date('2026-09-20T14:30:00Z');

  it('honours the feed precision instead of inventing a time', () => {
    // The site has been bitten before by treating a low-precision date as an
    // exact timestamp.
    expect(formatLaunchWhen(d, 'year')).toBe('2026');
    expect(formatLaunchWhen(d, 'month')).toBe('September 2026');
    expect(formatLaunchWhen(d, 'quarter')).toBe('September 2026');
    expect(formatLaunchWhen(d, 'day')).toBe('Sep 20, 2026');
    expect(formatLaunchWhen(d, 'exact')).toContain('14:30 UTC');
  });

  it('says so when there is no date', () => {
    expect(formatLaunchWhen(null, 'exact')).toBe('Date not yet announced');
  });
});

describe('launchSubject', () => {
  it('snapshots the facts an empty thread needs to render', () => {
    const s = launchSubject({
      id: 'e1', name: 'Falcon 9 | Starlink', rocket: 'Falcon 9', location: 'SLC-40',
      agency: 'SpaceX', mission: 'Starlink rideshare',
      launchDate: new Date('2026-09-20T14:30:00Z'), launchDatePrecision: 'day',
      status: 'upcoming',
    });
    expect(s.anchorType).toBe('launch');
    expect(s.anchorKey).toBe('e1');
    expect(s.url).toContain('/launch/e1');
    expect(s.facts).toMatchObject({ Vehicle: 'Falcon 9', Provider: 'SpaceX', Pad: 'SLC-40' });
    expect(s.subtitle).toContain('Starlink rideshare');
  });
});

describe('syncLaunchAnchors', () => {
  const now = new Date('2026-09-14T00:00:00Z');

  const event = {
    id: 'e1', name: 'Falcon 9 | Starlink', rocket: 'Falcon 9', location: 'SLC-40',
    agency: 'SpaceX', mission: null, launchDate: new Date('2026-09-20T14:30:00Z'),
    launchDatePrecision: 'day', status: 'upcoming',
  };

  it('refreshes rather than duplicates when a launch slips', async () => {
    db.spaceEvent.findMany.mockResolvedValue([event]);
    db.forumAnchor.findMany.mockResolvedValue([
      {
        anchorKey: 'e1',
        subjectDate: new Date('2026-09-18T14:30:00Z'), // slipped from here
        subjectTitle: 'Falcon 9 | Starlink',
        retiredAt: null,
      },
    ]);
    db.forumAnchor.updateMany.mockResolvedValue({ count: 1 });

    const r = await syncLaunchAnchors(now);

    expect(r.refreshed).toBe(1);
    expect(r.created).toBe(0);
    expect(db.forumThread.create).not.toHaveBeenCalled();
  });

  it('writes nothing when nothing a reader would notice has changed', async () => {
    db.spaceEvent.findMany.mockResolvedValue([event]);
    db.forumAnchor.findMany.mockResolvedValue([
      {
        anchorKey: 'e1',
        subjectDate: event.launchDate,
        subjectTitle: event.name,
        retiredAt: null,
      },
    ]);

    const r = await syncLaunchAnchors(now);

    expect(r.refreshed).toBe(0);
    expect(db.forumAnchor.updateMany).not.toHaveBeenCalled();
  });

  it('retires an anchor whose launch left the feed entirely', async () => {
    db.spaceEvent.findMany
      .mockResolvedValueOnce([]) // nothing in the horizon
      .mockResolvedValueOnce([]); // and the stale key is not a real event
    db.forumAnchor.findMany.mockResolvedValue([
      { anchorKey: 'gone', subjectDate: null, subjectTitle: 'x', retiredAt: null },
    ]);
    db.forumAnchor.updateMany.mockResolvedValue({ count: 1 });

    const r = await syncLaunchAnchors(now);
    expect(r.retired).toBe(1);
  });

  it('does not retire a launch that merely dropped out of the horizon', async () => {
    db.spaceEvent.findMany
      .mockResolvedValueOnce([]) // outside the horizon window
      .mockResolvedValueOnce([{ id: 'past' }]); // but still a real event
    db.forumAnchor.findMany.mockResolvedValue([
      { anchorKey: 'past', subjectDate: null, subjectTitle: 'x', retiredAt: null },
    ]);

    const r = await syncLaunchAnchors(now);
    expect(r.retired).toBe(0);
  });
});
